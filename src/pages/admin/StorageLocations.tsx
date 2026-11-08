import { useEffect, useRef, useState } from "react";
import { api, ApiStorageLocation, ApiStorageLocationItem } from "@/lib/api";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Check, X, Warehouse, Eye, Search } from "lucide-react";

export default function StorageLocations() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<ApiStorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<ApiStorageLocation | null>(null);

  const load = () => {
    setLoading(true);
    api.inventory.storageLocations.list()
      .then(setLocations)
      .catch(() => setError("Failed to load storage locations"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openModal = () => { setName(""); setError(""); setModalOpen(true); setTimeout(() => nameRef.current?.focus(), 40); };
  const closeModal = () => { setModalOpen(false); setName(""); setError(""); };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const created = await api.inventory.storageLocations.create(name);
      setLocations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      closeModal();
      toast("Storage location created successfully!", "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (sl: ApiStorageLocation) => { setEditId(sl.id); setEditName(sl.name); };

  const handleEdit = async (id: number) => {
    setSaving(true);
    setError("");
    try {
      const updated = await api.inventory.storageLocations.update(id, { name: editName });
      setLocations((prev) => prev.map((sl) => (sl.id === id ? updated : sl)).sort((a, b) => a.name.localeCompare(b.name)));
      setEditId(null);
      toast("Storage location updated successfully!", "success", "Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (sl: ApiStorageLocation) => {
    try {
      const updated = await api.inventory.storageLocations.update(sl.id, { is_active: !sl.is_active });
      setLocations((prev) => prev.map((x) => (x.id === sl.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError("");
    try {
      await api.inventory.storageLocations.delete(id);
      setLocations((prev) => prev.filter((sl) => sl.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
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
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Inventory</p>
            <h1 className="text-2xl font-bold text-foreground">Storage Locations</h1>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Add Location
          </button>
        </div>

        {error && !modalOpen && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Products</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Active</th>
                <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest w-64">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                    Loading…
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                    No storage locations yet — add one to start assigning products
                  </td>
                </tr>
              ) : locations.map((sl) => (
                <tr key={sl.id} className="hover:bg-chassis/50 transition-colors">
                  {editId === sl.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          type="text" value={editName} autoFocus
                          onChange={(e) => setEditName(e.target.value)}
                          className="field-input"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{sl.product_count ?? 0}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(sl.id)}
                            disabled={saving || !editName.trim()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            <Check size={11} /> Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                        <Warehouse size={14} className="text-muted-foreground" /> {sl.name}
                      </td>
                      <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{sl.product_count ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(sl)}
                          className={`relative w-9 h-5 rounded-full transition-colors ${sl.is_active ? "bg-primary" : "bg-border-subtle"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-background transition-transform ${sl.is_active ? "translate-x-4" : ""}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewing(sl)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <Eye size={11} /> Items
                          </button>
                          <button
                            onClick={() => startEdit(sl)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            <Pencil size={11} /> Edit
                          </button>
                          {confirmId === sl.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(sl.id)}
                                disabled={deletingId === sl.id}
                                className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                              >
                                {deletingId === sl.id ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="px-3 py-1.5 text-xs border border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmId(sl.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          {locations.length} {locations.length === 1 ? "location" : "locations"} · assign products to a location from the Products page
        </p>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background border border-border-subtle w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <p className="font-mono-tech text-[9px] text-primary tracking-[0.4em] uppercase mb-0.5">New</p>
                <h2 className="text-base font-bold text-foreground">Add Storage Location</h2>
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
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  placeholder="e.g. Main Store, Chicken Store"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                  className="field-input w-full"
                />
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
                disabled={saving || !name.trim()}
                className="flex items-center gap-2 h-9 px-5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check size={12} /> {saving ? "Saving…" : "Add Location"}
              </button>
            </div>
          </div>
        </div>
      )}
      {viewing && <LocationItems location={viewing} onClose={() => setViewing(null)} />}
    </AdminLayout>
  );
}

/** What a storage location holds right now: products and their batches. */
function LocationItems({ location, onClose }: { location: ApiStorageLocation; onClose: () => void }) {
  const [items, setItems] = useState<ApiStorageLocationItem[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    api.inventory.storageLocations.items(location.id)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load items"));
  }, [location.id]);
  const term = q.trim().toLowerCase();
  const shown = (items || []).filter((i) => !term || i.product_name.toLowerCase().includes(term) || (i.batch_number || "").toLowerCase().includes(term));
  const products = new Set((items || []).map((i) => i.product_id)).size;
  const units = (items || []).reduce((n, i) => n + (i.quantity > 0 ? i.quantity : 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border-subtle w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div>
            <p className="font-mono-tech text-[9px] text-primary tracking-[0.4em] uppercase mb-0.5">Items in store</p>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2"><Warehouse size={16} /> {location.name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-6 py-3 border-b border-border-subtle flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or batch" className="field-input w-full pl-9" />
          </div>
          {items && <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">{products} products · {units} units</span>}
        </div>
        <div className="overflow-y-auto">
          {error ? (
            <div className="px-6 py-8 text-sm text-red-400">{error}</div>
          ) : !items ? (
            <div className="px-6 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="px-6 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
              {items.length === 0 ? "Nothing stored here yet" : "No items match"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  <th className="text-left px-6 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product</th>
                  <th className="text-left px-4 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Batch</th>
                  <th className="text-left px-4 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Expiry</th>
                  <th className="text-right px-6 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {shown.map((i, idx) => {
                  const expired = i.days_to_expiry != null && i.days_to_expiry < 0;
                  const soon = i.days_to_expiry != null && i.days_to_expiry >= 0 && i.days_to_expiry <= 30;
                  return (
                    <tr key={`${i.product_id}-${i.batch_id ?? "x"}-${idx}`}>
                      <td className="px-6 py-2 text-foreground">{i.product_name}</td>
                      <td className="px-4 py-2 font-mono-tech text-xs text-muted-foreground">{i.batch_number || (i.batch_id === null ? "No batch" : "")}</td>
                      <td className={`px-4 py-2 ${expired ? "text-red-400 font-semibold" : soon ? "text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                        {i.expiry_date ? format(new Date(i.expiry_date), "dd/MM/yyyy") : "—"}{expired ? " (expired)" : ""}
                      </td>
                      <td className={`px-6 py-2 text-right font-mono-tech ${i.quantity <= 0 ? "text-red-400" : ""}`}>{i.quantity}{i.uom ? <span className="text-xs text-muted-foreground"> {i.uom}</span> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
