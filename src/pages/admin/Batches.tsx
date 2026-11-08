import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { api, ApiProduct, ApiProductBatch, ApiStorageLocation } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { useTenantPath } from "@/contexts/TenantContext";
import { DateField } from "@/components/ui/date-field";
import AdminLayout from "./AdminLayout";
import { Plus, X, Check, Search, Archive, Trash2, CalendarClock } from "lucide-react";

type View = "active" | "expiring" | "expired" | "retired" | "all";
const EXPIRING_DAYS = 30;

const fmtDate = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

function expiryState(b: ApiProductBatch): "expired" | "expiring" | "ok" | "none" {
  if (b.days_to_expiry == null) return "none";
  if (b.days_to_expiry < 0) return "expired";
  if (b.days_to_expiry <= EXPIRING_DAYS) return "expiring";
  return "ok";
}

const emptyForm = { batch_number: "", quantity: "", expiry_date: "", barcode: "", storage_location_id: "", cost_price: "" };

/** Every batch of every product: add, adjust, retire (write off) and track expiry in one place. */
export default function Batches() {
  const { toast } = useToast();
  const tp = useTenantPath();
  const [batches, setBatches] = useState<ApiProductBatch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [locations, setLocations] = useState<ApiStorageLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("active");
  const [q, setQ] = useState("");
  const [locationId, setLocationId] = useState("");

  const [adding, setAdding] = useState(false);
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [adjustId, setAdjustId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [retiring, setRetiring] = useState<ApiProductBatch | null>(null);
  const [retireReason, setRetireReason] = useState("Expired");
  const [confirmRetireAll, setConfirmRetireAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.inventory.batches.listAll()
      .then(setBatches)
      .catch((e) => toast(e instanceof Error ? e.message : "Could not load batches", "error", "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.products.list().then((ps) => setProducts(ps.filter((p: any) => p.product_type !== "service"))).catch(() => {});
    api.inventory.storageLocations.list().then((ls) => setLocations(ls.filter((l) => l.is_active))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const active = batches.filter((b) => b.status !== "retired");
    return {
      active: active.length,
      expiring: active.filter((b) => expiryState(b) === "expiring").length,
      expired: active.filter((b) => expiryState(b) === "expired").length,
      retired: batches.length - active.length,
      all: batches.length,
    };
  }, [batches]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return batches.filter((b) => {
      const retired = b.status === "retired";
      if (view === "active" && retired) return false;
      if (view === "retired" && !retired) return false;
      if (view === "expiring" && (retired || expiryState(b) !== "expiring")) return false;
      if (view === "expired" && (retired || expiryState(b) !== "expired")) return false;
      if (locationId && String(b.effective_location_id ?? "") !== locationId) return false;
      if (!term) return true;
      return [b.product_name, b.batch_number, b.barcode].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [batches, view, q, locationId]);

  const openAdd = (p?: ApiProduct) => {
    setProduct(p || null);
    setForm(emptyForm);
    setAdding(true);
  };

  const addBatch = async () => {
    const quantity = Number(form.quantity);
    if (!product) return toast("Choose a product.", "error", "Missing info");
    if (!form.batch_number.trim() || !quantity || quantity <= 0) {
      return toast("Batch number and a quantity greater than zero are required.", "error", "Missing info");
    }
    setSaving(true);
    try {
      await api.inventory.batches.create({
        product_id: product.id,
        batch_number: form.batch_number.trim(),
        quantity,
        expiry_date: form.expiry_date || undefined,
        barcode: form.barcode.trim() || undefined,
        storage_location_id: form.storage_location_id ? Number(form.storage_location_id) : undefined,
        cost_price: form.cost_price === "" ? undefined : Number(form.cost_price),
      });
      toast(`Batch ${form.batch_number.trim()} added to ${product.name}.`, "success", "Saved");
      setAdding(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not add batch", "error", "Error");
    } finally {
      setSaving(false);
    }
  };

  const submitAdjust = async (b: ApiProductBatch) => {
    const delta = Number(adjustQty);
    if (!delta) return;
    setBusy(true);
    try {
      await api.inventory.batches.adjust(b.id, delta);
      setAdjustId(null);
      setAdjustQty("");
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not adjust batch", "error", "Error");
    } finally {
      setBusy(false);
    }
  };

  const retire = async () => {
    if (!retiring) return;
    setBusy(true);
    try {
      const r = await api.inventory.batches.retire(retiring.id, retireReason.trim() || "Expired");
      toast(`Batch ${retiring.batch_number} retired${r.written_off ? ` — ${r.written_off} written off` : ""}.`, "success", "Retired");
      setRetiring(null);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not retire batch", "error", "Error");
    } finally {
      setBusy(false);
    }
  };

  const retireAllExpired = async () => {
    setBusy(true);
    try {
      const r = await api.inventory.batches.retireExpired();
      toast(`${r.retired} expired batch${r.retired === 1 ? "" : "es"} retired — ${r.written_off} written off.`, "success", "Retired");
      setConfirmRetireAll(false);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not retire expired batches", "error", "Error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: ApiProductBatch) => {
    if (!window.confirm(`Remove empty batch ${b.batch_number}?`)) return;
    try {
      await api.inventory.batches.delete(b.id);
      load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not remove batch", "error", "Error");
    }
  };

  const tabs: [View, string][] = [["active", "Active"], ["expiring", `Expiring ≤${EXPIRING_DAYS}d`], ["expired", "Expired"], ["retired", "Retired"], ["all", "All"]];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8 w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Inventory</p>
            <h1 className="text-2xl font-bold text-foreground">Batches</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {counts.expired > 0 && (
              <button
                onClick={() => setConfirmRetireAll(true)}
                className="flex items-center gap-2 h-10 px-4 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 transition-colors"
              >
                <Archive size={14} /> Retire all expired ({counts.expired})
              </button>
            )}
            <button
              onClick={() => openAdd()}
              className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} /> Add Batch
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`px-3 py-1.5 text-xs font-mono-tech uppercase tracking-widest border transition-colors ${
                view === key ? "border-primary text-primary bg-primary/10" : "border-border-subtle text-muted-foreground hover:text-foreground"
              } ${key === "expired" && counts.expired > 0 && view !== key ? "text-red-400" : ""}`}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product, batch or barcode" className="field-input w-full pl-9" />
          </div>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="field-input w-auto">
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="border border-border-subtle overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                {["Product", "Batch", "Qty", "Expiry", "Location", "Status", ""].map((h, i) => (
                  <th key={i} className={`px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest ${i === 2 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                  {batches.length === 0 ? "No batches yet — add one to start tracking lots and expiry" : "No batches match"}
                </td></tr>
              ) : shown.map((b) => {
                const st = expiryState(b);
                const retired = b.status === "retired";
                return (
                  <tr key={b.id} className={`hover:bg-chassis/50 transition-colors ${retired ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link to={tp(`/admin/products/${b.product_id}/edit`)} className="hover:text-primary">{b.product_name}</Link>
                    </td>
                    <td className="px-4 py-3 font-mono-tech text-xs">
                      {b.batch_number}
                      {b.barcode ? <div className="text-muted-foreground">{b.barcode}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-tech">
                      {retired ? <span className="text-muted-foreground">0{b.retired_quantity ? ` (${b.retired_quantity} written off)` : ""}</span> : b.quantity_on_hand}
                      {b.product_uom ? <span className="text-muted-foreground text-xs"> {b.product_uom}</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={st === "expired" && !retired ? "text-red-400 font-semibold" : st === "expiring" && !retired ? "text-amber-400 font-semibold" : ""}>
                        {fmtDate(b.expiry_date)}
                      </span>
                      {!retired && b.days_to_expiry != null && (
                        <div className="text-xs text-muted-foreground">
                          {b.days_to_expiry < 0 ? `expired ${-b.days_to_expiry}d ago` : b.days_to_expiry === 0 ? "expires today" : `${b.days_to_expiry}d left`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.storage_location_name || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {retired ? (
                        <span title={b.retired_by_email || undefined}>Retired {fmtDate(b.retired_at)}{b.retire_reason ? ` · ${b.retire_reason}` : ""}</span>
                      ) : st === "expired" ? <span className="text-red-400 font-semibold">Expired</span>
                        : st === "expiring" ? <span className="text-amber-400 font-semibold">Expiring</span>
                        : <span className="text-primary">Active</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {retired ? (
                          <button onClick={() => remove(b)} title="Remove from list" className="text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                        ) : adjustId === b.id ? (
                          <>
                            <input type="number" autoFocus value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") submitAdjust(b); if (e.key === "Escape") setAdjustId(null); }}
                              placeholder="+/- qty" className="field-input w-24 py-1" />
                            <button disabled={busy} onClick={() => submitAdjust(b)} className="text-primary"><Check size={14} /></button>
                            <button onClick={() => { setAdjustId(null); setAdjustQty(""); }} className="text-muted-foreground"><X size={14} /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setAdjustId(b.id); setAdjustQty(""); }}
                              className="px-2.5 py-1 border border-border-subtle text-xs text-muted-foreground hover:text-foreground">Adjust</button>
                            <button onClick={() => { setRetiring(b); setRetireReason(st === "expired" ? "Expired" : ""); }}
                              className="px-2.5 py-1 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400">Retire</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          POS sells from the batch that expires first · retiring a batch writes off its remaining stock
        </p>
      </div>

      {adding && (
        <Modal title="Add Batch" onClose={() => setAdding(false)}>
          <div className="space-y-4">
            <div>
              <label className="field-label">Product *</label>
              <ProductPicker products={products} value={product} onChange={setProduct} />
              <p className="text-[11px] text-muted-foreground mt-1">
                Not in the list? <Link to={tp("/admin/products/new")} className="text-primary hover:underline">Create the product</Link> first, then add its batch here.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Batch number *</label>
                <input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="e.g. B2026-11" className="field-input w-full" />
              </div>
              <div>
                <label className="field-label">Quantity *</label>
                <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" className="field-input w-full" />
              </div>
              <div>
                <label className="field-label">Expiry date</label>
                <DateField value={form.expiry_date} onChange={(v) => setForm({ ...form, expiry_date: v })} />
              </div>
              <div>
                <label className="field-label">Storage location</label>
                <select value={form.storage_location_id} onChange={(e) => setForm({ ...form, storage_location_id: e.target.value })} className="field-input w-full">
                  <option value="">Same as product</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Barcode (optional)</label>
                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or type" className="field-input w-full" />
              </div>
              <div>
                <label className="field-label">Cost price (optional)</label>
                <input type="number" min={0} step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="field-input w-full" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">The quantity is added to the product's stock. Adding to an existing batch number adds to that batch.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setAdding(false)} className="h-9 px-5 border border-border-subtle text-xs text-muted-foreground uppercase tracking-widest font-bold hover:text-foreground">Cancel</button>
            <button onClick={addBatch} disabled={saving} className="flex items-center gap-2 h-9 px-5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
              <Check size={12} /> {saving ? "Saving…" : "Add Batch"}
            </button>
          </div>
        </Modal>
      )}

      {retiring && (
        <Modal title={`Retire batch ${retiring.batch_number}`} onClose={() => setRetiring(null)}>
          <p className="text-sm text-foreground">
            {retiring.product_name}: <strong>{retiring.quantity_on_hand}</strong> left in this batch will be written off and it can no longer be sold. This can't be undone.
          </p>
          <div className="mt-4">
            <label className="field-label">Reason *</label>
            <input autoFocus value={retireReason} onChange={(e) => setRetireReason(e.target.value)} placeholder="Expired, damaged, recalled…" className="field-input w-full" />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setRetiring(null)} className="h-9 px-5 border border-border-subtle text-xs text-muted-foreground uppercase tracking-widest font-bold hover:text-foreground">Cancel</button>
            <button onClick={retire} disabled={busy || !retireReason.trim()} className="flex items-center gap-2 h-9 px-5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 disabled:opacity-50">
              <Archive size={12} /> {busy ? "Retiring…" : "Retire batch"}
            </button>
          </div>
        </Modal>
      )}

      {confirmRetireAll && (
        <Modal title="Retire all expired batches" onClose={() => setConfirmRetireAll(false)}>
          <p className="text-sm text-foreground">
            {counts.expired} expired batch{counts.expired === 1 ? "" : "es"} will be retired and their remaining stock written off. This can't be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setConfirmRetireAll(false)} className="h-9 px-5 border border-border-subtle text-xs text-muted-foreground uppercase tracking-widest font-bold hover:text-foreground">Cancel</button>
            <button onClick={retireAllExpired} disabled={busy} className="flex items-center gap-2 h-9 px-5 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-600 disabled:opacity-50">
              <CalendarClock size={12} /> {busy ? "Retiring…" : "Retire all expired"}
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background border border-border-subtle w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** Type to search products by name or barcode; pick one from the list. */
function ProductPicker({ products, value, onChange }: { products: ApiProduct[]; value: ApiProduct | null; onChange: (p: ApiProduct | null) => void }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    return products.filter((p) => !t || p.name.toLowerCase().includes(t) || (p.barcode || "").toLowerCase().includes(t)).slice(0, 50);
  }, [products, term]);

  if (value) {
    return (
      <div className="flex items-center justify-between field-input">
        <span className="font-medium">{value.name}</span>
        <button type="button" onClick={() => { onChange(null); setTerm(""); setOpen(true); }} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
      </div>
    );
  }
  return (
    <div className="relative" ref={ref}>
      <input autoFocus value={term} onFocus={() => setOpen(true)} onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        placeholder="Search product name or barcode" className="field-input w-full" />
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-background border border-border-subtle shadow-xl">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No products found</div>
          ) : matches.map((p) => (
            <button key={p.id} type="button" onClick={() => { onChange(p); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-chassis">
              {p.name}
              <span className="text-xs text-muted-foreground"> · {(p as any).quantity_on_hand ?? 0} in stock</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
