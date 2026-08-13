import { useEffect, useMemo, useRef, useState } from "react";
import { api, RestaurantTable, POSSale } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, X, Check, UtensilsCrossed } from "lucide-react";

export default function Tables() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [heldSales, setHeldSales] = useState<POSSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [location, setLocation] = useState("");
  const [count, setCount] = useState<number | "">(4);
  const [saving, setSaving] = useState(false);
  const locationRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.tables.list(), api.pos.getHeldSales()])
      .then(([t, s]) => { setTables(t); setHeldSales(s); })
      .catch(() => setError("Failed to load tables"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Table id -> running order summary, derived from held sales (the single
  // source of truth for occupancy — a table has no stored status of its own).
  const occupancy = useMemo(() => {
    const map = new Map<number, { items: number; total: number }>();
    for (const sale of heldSales) {
      if (!sale.table_id) continue;
      const items = (sale.items || []).reduce((n, it) => n + it.quantity, 0);
      map.set(sale.table_id, { items, total: Number(sale.total_amount) });
    }
    return map;
  }, [heldSales]);

  const groups = useMemo(() => {
    const byLocation = new Map<string, RestaurantTable[]>();
    for (const t of tables) {
      if (!byLocation.has(t.location)) byLocation.set(t.location, []);
      byLocation.get(t.location)!.push(t);
    }
    return Array.from(byLocation.entries());
  }, [tables]);

  const openModal = () => { setLocation(""); setCount(4); setError(""); setModalOpen(true); setTimeout(() => locationRef.current?.focus(), 40); };
  const closeModal = () => { setModalOpen(false); setError(""); };

  const handleAdd = async () => {
    if (!location.trim() || !count || Number(count) < 1) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.tables.create({ location: location.trim(), count: Number(count) });
      setTables((prev) => [...prev, ...created]);
      closeModal();
      toast(`${created.length} table(s) added to ${location.trim()}`, "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await api.tables.delete(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error", "Error");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Restaurant</p>
            <h1 className="text-2xl font-bold text-foreground">Tables</h1>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Add Tables
          </button>
        </div>

        {error && !modalOpen && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</p>
        ) : tables.length === 0 ? (
          <div className="border border-dashed border-border-subtle p-12 text-center">
            <UtensilsCrossed className="mx-auto mb-3 text-muted-foreground" size={28} />
            <p className="text-sm text-muted-foreground">No tables yet. Add your first location — e.g. "Ground Floor" with 4 tables.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(([loc, locTables]) => (
              <div key={loc} className="border border-border-subtle overflow-hidden">
                <div className="px-4 py-2.5 bg-chassis border-b border-border-subtle">
                  <h2 className="text-sm font-bold text-foreground">{loc}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                  {locTables.map((t) => {
                    const order = occupancy.get(t.id);
                    const occupied = !!order;
                    return (
                      <div
                        key={t.id}
                        className={`relative border p-3 ${occupied ? "border-amber-500/40 bg-amber-500/5" : "border-border-subtle"}`}
                      >
                        <p className="font-medium text-foreground text-sm">{t.label}</p>
                        {occupied ? (
                          <p className="text-[11px] text-amber-500 mt-1">
                            Occupied · {order!.items} item(s) · {baseCurrency?.symbol || ""} {order!.total.toFixed(2)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-1">Available</p>
                        )}

                        {!occupied && (
                          confirmId === t.id ? (
                            <div className="flex gap-1 mt-2">
                              <button
                                onClick={() => handleDelete(t.id)}
                                disabled={deletingId === t.id}
                                className="px-2 py-1 text-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {deletingId === t.id ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="px-2 py-1 text-[10px] border border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(t.id)}
                              className="absolute top-2 right-2 text-muted-foreground/50 hover:text-red-400 transition-colors"
                              title="Delete table"
                            >
                              <Trash2 size={12} />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          {tables.length} table(s) · used by the "Tables" selector in POS
        </p>
      </div>

      {/* ── Add Tables Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background border border-border-subtle w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <p className="font-mono-tech text-[9px] text-primary tracking-[0.4em] uppercase mb-0.5">New</p>
                <h2 className="text-base font-bold text-foreground">Add Tables</h2>
              </div>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Location <span className="text-red-400">*</span>
                </label>
                <input
                  ref={locationRef}
                  type="text"
                  value={location}
                  placeholder="Insert location"
                  onChange={(e) => setLocation(e.target.value)}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1.5">
                  Number of Tables <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="field-input w-24 text-center"
                />
                <p className="mt-1.5 text-[10px] text-muted-foreground font-mono-tech">
                  Creates Table 1…Table {count || "N"} at this location.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-subtle">
              <button
                onClick={closeModal}
                className="h-9 px-5 border border-border-subtle text-xs text-muted-foreground uppercase tracking-widest font-bold hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !location.trim() || !count || Number(count) < 1}
                className="flex items-center gap-2 h-9 px-5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check size={12} /> {saving ? "Saving…" : "Add Tables"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
