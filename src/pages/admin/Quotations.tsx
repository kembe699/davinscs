import { useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { Plus, Search, Trash2, Edit2, X, Eye, FileText, ChevronRight, Printer, Download } from "lucide-react";
import { openPrintWindow, companyHeaderHTML, downloadDocument } from "@/utils/printUtils";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "converted"];
const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-gray-500/10 text-gray-400 border border-gray-500/30",
  sent:      "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  accepted:  "bg-green-500/10 text-green-400 border border-green-500/30",
  rejected:  "bg-red-500/10 text-red-400 border border-red-500/30",
  converted: "bg-purple-500/10 text-purple-400 border border-purple-500/30",
};

const emptyItem = () => ({ product_id: null as number | null, product_name: "", description: "", quantity: 1, unit_price: 0, tax_rate: 0, subtotal: 0 });

const emptyForm = {
  customer_id: null as number | null,
  customer_name: "", customer_email: "", customer_phone: "", customer_address: "",
  valid_until: "", notes: "", discount_amount: 0,
  items: [emptyItem()],
};

function calcTotals(items: ReturnType<typeof emptyItem>[], discount: number) {
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax = items.reduce((s, i) => s + Math.round(i.unit_price * i.quantity * (i.tax_rate || 0) / 100), 0);
  return { subtotal, tax, total: subtotal + tax - discount };
}

export default function Quotations() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (search) params.search = search;
      const data = await api.quotations.list(params);
      setQuotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.customers.list().then(setCustomers).catch(() => {});
    api.products.list().then(setProducts).catch(() => {});
  }, [statusFilter]);

  const setItem = (idx: number, field: string, value: any) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === "unit_price" || field === "quantity") {
        items[idx].subtotal = items[idx].unit_price * items[idx].quantity;
      }
      return { ...f, items };
    });
  };

  const pickProduct = (idx: number, productId: number) => {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], product_id: p.id, product_name: p.name, unit_price: p.price, subtotal: p.price * items[idx].quantity };
      return { ...f, items };
    });
  };

  const pickCustomer = (customerId: number) => {
    const c = customers.find(x => x.id === customerId);
    if (!c) return;
    setForm(f => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name,
      customer_email: c.email || "",
      customer_phone: c.phone || "",
      customer_address: [c.address, c.city, c.country].filter(Boolean).join(", "),
    }));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
  };

  const openEdit = async (id: number) => {
    try {
      const data = await api.quotations.get(id);
      setForm({
        customer_id: data.customer_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email || "",
        customer_phone: data.customer_phone || "",
        customer_address: data.customer_address || "",
        valid_until: data.valid_until ? data.valid_until.split("T")[0] : "",
        notes: data.notes || "",
        discount_amount: data.discount_amount || 0,
        items: data.items.length > 0 ? data.items : [emptyItem()],
      });
      setEditingId(id);
      setShowForm(true);
      setError("");
    } catch {
      toast("Failed to load quotation", "error", "Error");
    }
  };

  const handleSave = async () => {
    if (!form.customer_name.trim()) { setError("Customer name is required"); return; }
    if (form.items.some(i => !i.product_name.trim())) { setError("All items need a product name"); return; }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.quotations.update(editingId, form);
      } else {
        await api.quotations.create(form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      await api.quotations.delete(id);
      setQuotations(qs => qs.filter(q => q.id !== id));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error", "Error");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await api.quotations.updateStatus(id, status);
      setQuotations(qs => qs.map(q => q.id === id ? { ...q, status: updated.status } : q));
      if (detail?.id === id) setDetail((d: any) => ({ ...d, status: updated.status }));
    } catch {
      toast("Failed to update status", "error", "Error");
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api.quotations.get(id);
      setDetail(data);
    } catch {
      toast("Failed to load quotation", "error", "Error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConvert = async (id: number) => {
    if (!confirm("Convert this quotation to an invoice?")) return;
    setConverting(true);
    try {
      const result = await api.quotations.convert(id);
      toast(`Invoice created: INV-${String(result.invoice_id).padStart(4, "0")} — find it under Invoices.`, "success", "Invoice Created");
      setDetail(null);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Convert failed", "error", "Error");
    } finally {
      setConverting(false);
    }
  };

  const { subtotal, tax, total } = calcTotals(form.items, form.discount_amount);

  const buildQuoteBody = async (): Promise<string> => {
    if (!detail) return '';
    const co = await api.company.get().catch(() => ({}));
    const fmt = (n: number) => `${sym} ${Number(n || 0).toLocaleString()}`;

    const itemRows = detail.items.map((i: any) => `
      <tr>
        <td>${i.product_name}${i.description ? `<br><span style="color:#888;font-size:9px">${i.description}</span>` : ''}</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${fmt(i.unit_price)}</td>
        <td class="num">${i.tax_rate || 0}%</td>
        <td class="num">${fmt(i.subtotal)}</td>
      </tr>`).join('');

    const extraMeta = `
      <div class="doc-date">Date: ${new Date(detail.created_at).toLocaleDateString()}</div>
      ${detail.valid_until ? `<div class="doc-date">Valid Until: ${new Date(detail.valid_until).toLocaleDateString()}</div>` : ''}
      <span class="status-badge status-${detail.status}">${detail.status.toUpperCase()}</span>`;

    const body = `
      ${companyHeaderHTML(co, 'QUOTATION', detail.quote_number, extraMeta)}

      <div class="info-box">
        <div class="info-label">Quote To</div>
        <div class="info-name">${detail.customer_name}</div>
        ${detail.customer_phone ? `<div class="info-detail">Phone: ${detail.customer_phone}</div>` : ''}
        ${detail.customer_email ? `<div class="info-detail">Email: ${detail.customer_email}</div>` : ''}
        ${detail.customer_address ? `<div class="info-detail">${detail.customer_address}</div>` : ''}
      </div>

      <div class="section-title">Items</div>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr><td colspan="4" class="num">Subtotal</td><td class="num">${fmt(detail.subtotal)}</td></tr>
          ${detail.tax_amount > 0 ? `<tr><td colspan="4" class="num">Tax</td><td class="num">${fmt(detail.tax_amount)}</td></tr>` : ''}
          ${detail.discount_amount > 0 ? `<tr><td colspan="4" class="num">Discount</td><td class="num">-${fmt(detail.discount_amount)}</td></tr>` : ''}
        </tfoot>
      </table>

      <div class="summary">
        <table class="summary-table">
          <tr class="total-row"><td>TOTAL</td><td class="num">${fmt(detail.total_amount)}</td></tr>
        </table>
      </div>

      ${detail.notes ? `<div class="notes-box"><strong>Notes:</strong> ${detail.notes}</div>` : ''}

      <div class="footer">
        Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; This is a computer-generated document. No signature is required.
      </div>`;

    return body;
  };

  const printQuote = async () => {
    if (!detail) return;
    openPrintWindow(`Quotation ${detail.quote_number}`, await buildQuoteBody());
  };

  const downloadQuote = async () => {
    if (!detail) return;
    downloadDocument(`Quotation_${detail.quote_number}`, await buildQuoteBody());
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Sales</p>
            <h1 className="text-2xl font-bold text-foreground">Quotations</h1>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Quote
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 h-10 bg-background border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary"
              placeholder="Search by quote # or customer…"
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()} />
          </div>
          <select className="h-10 px-3 bg-background border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Table */}
        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse">Loading…</p>
        ) : (
          <div className="border border-border-subtle overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  {["Quote #","Customer","Date","Valid Until","Status","Total",""].map(h => (
                    <th key={h} className={`px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest ${h === "Total" || h === "" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {quotations.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No quotations found</td></tr>
                )}
                {quotations.map(q => (
                  <tr key={q.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-4 py-3 font-mono-tech text-xs text-primary">{q.quote_number}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{q.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-[10px] font-mono-tech px-2 py-0.5 rounded border-0 outline-none cursor-pointer ${STATUS_STYLE[q.status] || ""} bg-transparent`}
                        value={q.status}
                        onChange={e => handleStatusChange(q.id, e.target.value)}
                        disabled={q.status === "converted"}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-background text-foreground">{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrencySync(q.total_amount, sym, false)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetail(q.id)} className="p-1 text-muted-foreground hover:text-primary"><Eye size={14} /></button>
                        {q.status !== "converted" && (
                          <button onClick={() => openEdit(q.id)} className="p-1 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                        )}
                        <button onClick={() => handleDelete(q.id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-subtle w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0">
              <h2 className="font-bold text-foreground">{editingId ? "Edit Quotation" : "New Quotation"}</h2>
              <button onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {error && <p className="text-red-400 text-sm">{error}</p>}

              {/* Customer section */}
              <div>
                <p className="font-mono-tech text-[10px] text-primary uppercase tracking-widest mb-3">Customer</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Select existing customer</label>
                    <select className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                      value={form.customer_id || ""}
                      onChange={e => e.target.value ? pickCustomer(Number(e.target.value)) : setForm(f => ({ ...f, customer_id: null }))}>
                      <option value="">— Or fill manually below —</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ""}</option>)}
                    </select>
                  </div>
                  {[
                    { field: "customer_name", label: "Name *", colSpan: 1 },
                    { field: "customer_email", label: "Email", colSpan: 1 },
                    { field: "customer_phone", label: "Phone", colSpan: 1 },
                    { field: "customer_address", label: "Address", colSpan: 1 },
                  ].map(({ field, label, colSpan }) => (
                    <div key={field} className={colSpan === 2 ? "col-span-2" : ""}>
                      <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">{label}</label>
                      <input className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                        value={(form as any)[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Valid Until</label>
                    <input type="date" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                      value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Discount ({sym})</label>
                    <input type="number" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                      value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono-tech text-[10px] text-primary uppercase tracking-widest">Line Items</p>
                  <button onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Product</label>}
                        <select className="w-full h-9 px-2 bg-background border border-border-subtle text-foreground text-xs focus:outline-none focus:border-primary"
                          value={item.product_id || ""}
                          onChange={e => e.target.value ? pickProduct(idx, Number(e.target.value)) : null}>
                          <option value="">— Pick product —</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Name</label>}
                        <input className="w-full h-9 px-2 bg-background border border-border-subtle text-foreground text-xs focus:outline-none focus:border-primary"
                          placeholder="Item name" value={item.product_name}
                          onChange={e => setItem(idx, "product_name", e.target.value)} />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Unit Price</label>}
                        <input type="number" className="w-full h-9 px-2 bg-background border border-border-subtle text-foreground text-xs focus:outline-none focus:border-primary"
                          value={item.unit_price} onChange={e => setItem(idx, "unit_price", Number(e.target.value))} />
                      </div>
                      <div className="col-span-1">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Qty</label>}
                        <input type="number" min={1} className="w-full h-9 px-2 bg-background border border-border-subtle text-foreground text-xs focus:outline-none focus:border-primary"
                          value={item.quantity} onChange={e => setItem(idx, "quantity", Number(e.target.value))} />
                      </div>
                      <div className="col-span-1">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Tax%</label>}
                        <input type="number" min={0} className="w-full h-9 px-2 bg-background border border-border-subtle text-foreground text-xs focus:outline-none focus:border-primary"
                          value={item.tax_rate} onChange={e => setItem(idx, "tax_rate", Number(e.target.value))} />
                      </div>
                      <div className="col-span-1">
                        {idx === 0 && <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Total</label>}
                        <div className="h-9 flex items-center text-xs text-muted-foreground font-mono">
                          {(item.unit_price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end justify-end pb-0.5">
                        <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                          disabled={form.items.length === 1}
                          className="p-1 text-muted-foreground hover:text-red-400 disabled:opacity-30">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase font-mono-tech">Notes</label>
                <textarea rows={2} className="w-full px-3 py-2 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary resize-none"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* Totals summary */}
              <div className="border-t border-border-subtle pt-4 ml-auto w-64 space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="font-mono">{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="font-mono">{tax.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span className="font-mono">-{form.discount_amount.toLocaleString()}</span></div>
                <div className="flex justify-between text-base font-bold text-foreground border-t border-border-subtle pt-2 mt-2">
                  <span>Total</span><span className="font-mono">{sym} {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle shrink-0">
              <button onClick={() => setShowForm(false)} className="h-9 px-4 text-sm border border-border-subtle text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="h-9 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving…" : editingId ? "Update" : "Create Quote"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Preview Modal */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-subtle w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse">Loading…</div>
            ) : detail && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-primary" />
                    <div>
                      <h2 className="font-bold text-foreground">{detail.quote_number}</h2>
                      <span className={`text-[10px] font-mono-tech px-2 py-0.5 rounded ${STATUS_STYLE[detail.status] || ""}`}>{detail.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={printQuote} className="flex items-center gap-1 h-8 px-3 border border-border-subtle text-xs text-muted-foreground hover:text-foreground">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={downloadQuote} className="flex items-center gap-1 h-8 px-3 bg-blue-600 text-white text-xs hover:bg-blue-700">
                      <Download size={12} /> Download PDF
                    </button>
                    {detail.status !== "converted" && (
                      <button onClick={() => handleConvert(detail.id)} disabled={converting}
                        className="flex items-center gap-1 h-8 px-3 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                        {converting ? "Converting…" : "Convert to Invoice"}
                      </button>
                    )}
                    {detail.converted_invoice_id && (
                      <span className="text-xs text-purple-400 font-mono-tech">→ Invoice created</span>
                    )}
                    <button onClick={() => setDetail(null)}><X size={16} /></button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Customer info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest mb-2">Customer</p>
                      <p className="font-bold text-foreground">{detail.customer_name}</p>
                      {detail.customer_email && <p className="text-sm text-muted-foreground">{detail.customer_email}</p>}
                      {detail.customer_phone && <p className="text-sm text-muted-foreground">{detail.customer_phone}</p>}
                      {detail.customer_address && <p className="text-sm text-muted-foreground">{detail.customer_address}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest mb-2">Details</p>
                      <p className="text-sm text-foreground">Created: {new Date(detail.created_at).toLocaleDateString()}</p>
                      {detail.valid_until && <p className="text-sm text-muted-foreground">Valid until: {new Date(detail.valid_until).toLocaleDateString()}</p>}
                    </div>
                  </div>

                  {/* Items table */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="text-left py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Item</th>
                        <th className="text-center py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Qty</th>
                        <th className="text-right py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Unit Price</th>
                        <th className="text-right py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Tax%</th>
                        <th className="text-right py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {detail.items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-3 text-foreground">{item.product_name}{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}</td>
                          <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                          <td className="py-3 text-right font-mono text-xs">{formatCurrencySync(item.unit_price, sym, false)}</td>
                          <td className="py-3 text-right text-xs text-muted-foreground">{item.tax_rate || 0}%</td>
                          <td className="py-3 text-right font-mono text-xs">{formatCurrencySync(item.subtotal, sym, false)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="ml-auto w-64 space-y-1 border-t border-border-subtle pt-4">
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="font-mono">{formatCurrencySync(detail.subtotal, sym, false)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span className="font-mono">{formatCurrencySync(detail.tax_amount, sym, false)}</span></div>
                    {detail.discount_amount > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>Discount</span><span className="font-mono">-{formatCurrencySync(detail.discount_amount, sym, false)}</span></div>}
                    <div className="flex justify-between text-base font-bold text-foreground border-t border-border-subtle pt-2 mt-2">
                      <span>Total</span><span className="font-mono">{formatCurrencySync(detail.total_amount, sym, false)}</span>
                    </div>
                  </div>

                  {detail.notes && (
                    <div className="border-t border-border-subtle pt-4">
                      <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest mb-1">Notes</p>
                      <p className="text-sm text-foreground">{detail.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
