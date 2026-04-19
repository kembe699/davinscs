import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { Plus, Search, Trash2, Edit2, X, Eye, ChevronRight, Users, ShoppingBag, Receipt } from "lucide-react";

const emptyForm = {
  name: "", email: "", phone: "", address: "", city: "",
  postal_code: "", country: "", credit_limit: 0, payment_terms: 30,
};

const STATUS_STYLE: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  processing: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  shipped:    "bg-purple-500/10 text-purple-400 border border-purple-500/30",
  delivered:  "bg-green-500/10 text-green-400 border border-green-500/30",
  cancelled:  "bg-red-500/10 text-red-400 border border-red-500/30",
  unpaid:     "bg-red-500/10 text-red-400 border border-red-500/30",
  paid:       "bg-green-500/10 text-green-400 border border-green-500/30",
  partial:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  voided:     "bg-gray-500/10 text-gray-400 border border-gray-500/30",
};

export default function Customers() {
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "pos" | "invoices">("orders");

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const data = await api.customers.list(q);
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); setError(""); };
  const openEdit = (c: any) => {
    setForm({
      name: c.name, email: c.email || "", phone: c.phone || "",
      address: c.address || "", city: c.city || "", postal_code: c.postal_code || "",
      country: c.country || "", credit_limit: c.credit_limit || 0, payment_terms: c.payment_terms || 30,
    });
    setEditingId(c.id);
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await api.customers.update(editingId, form);
      } else {
        await api.customers.create(form);
      }
      setShowForm(false);
      load(search || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await api.customers.delete(id);
      setCustomers(cs => cs.filter(c => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api.customers.get(id);
      setDetail(data);
    } catch (err) {
      alert("Failed to load customer details");
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">CRM</p>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-4 h-10 bg-background border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value || undefined); }}
          />
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
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Email</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Phone</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">City</th>
                  <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Orders</th>
                  <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Total Spent</th>
                  <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Balance</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No customers found</td></tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-4 py-3 text-right text-primary font-mono-tech text-xs">{c.order_count || 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrencySync(Number(c.total_spent || 0), sym, false)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-yellow-400">{formatCurrencySync(Number(c.balance || 0), sym, false)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openDetail(c.id)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Eye size={14} /></button>
                        <button onClick={() => openEdit(c)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1 text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-subtle w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <h2 className="font-bold text-foreground">{editingId ? "Edit Customer" : "Add Customer"}</h2>
              <button onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Name *</label>
                <input className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              {(["email","phone","address","city","postal_code","country"] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">{field.replace("_"," ")}</label>
                  <input className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                    value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Credit Limit ({sym})</label>
                <input type="number" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Payment Terms (days)</label>
                <input type="number" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle">
              <button onClick={() => setShowForm(false)} className="h-9 px-4 text-sm border border-border-subtle text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="h-9 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {(detailLoading || detail) && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-subtle w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="p-12 text-center text-muted-foreground animate-pulse">Loading…</div>
            ) : detail && (
              <>
                <div className="flex items-start justify-between px-6 py-5 border-b border-border-subtle">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={16} className="text-primary" />
                      <h2 className="font-bold text-foreground text-lg">{detail.customer.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-mono-tech">
                      {detail.customer.email && <span>{detail.customer.email}</span>}
                      {detail.customer.phone && <span>{detail.customer.phone}</span>}
                      {detail.customer.city && <span>{detail.customer.city}, {detail.customer.country}</span>}
                    </div>
                  </div>
                  <button onClick={() => setDetail(null)}><X size={16} /></button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-border-subtle border-b border-border-subtle">
                  {[
                    { label: "Web Orders", value: detail.orders.length },
                    { label: "POS Sales", value: detail.posOrders.length },
                    { label: "Invoices", value: detail.invoices.length },
                  ].map(s => (
                    <div key={s.label} className="px-6 py-4 text-center">
                      <p className="text-2xl font-bold text-primary">{s.value}</p>
                      <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border-subtle">
                  {[
                    { id: "orders" as const, label: "Web Orders", icon: ShoppingBag },
                    { id: "pos" as const, label: "POS Sales", icon: ShoppingBag },
                    { id: "invoices" as const, label: "Invoices", icon: Receipt },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      <tab.icon size={14} />{tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {activeTab === "orders" && (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border-subtle">
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Order #</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Status</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Amount</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Date</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border-subtle">
                        {detail.orders.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">No web orders</td></tr>}
                        {detail.orders.map((o: any) => (
                          <tr key={o.id}>
                            <td className="py-2 font-mono-tech text-xs text-primary">{o.order_number}</td>
                            <td className="py-2"><span className={`px-2 py-0.5 text-[10px] rounded font-mono-tech ${STATUS_STYLE[o.status] || ""}`}>{o.status}</span></td>
                            <td className="py-2 text-right font-mono text-xs">{formatCurrencySync(o.total_amount, sym, false)}</td>
                            <td className="py-2 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activeTab === "pos" && (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border-subtle">
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Sale #</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Type</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Amount</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Date</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border-subtle">
                        {detail.posOrders.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">No POS sales</td></tr>}
                        {detail.posOrders.map((o: any) => (
                          <tr key={o.id}>
                            <td className="py-2 font-mono-tech text-xs text-primary">{o.order_number}</td>
                            <td className="py-2 text-xs capitalize text-muted-foreground">{o.sale_type || "regular"}</td>
                            <td className="py-2 text-right font-mono text-xs">{formatCurrencySync(o.total_amount, sym, false)}</td>
                            <td className="py-2 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {activeTab === "invoices" && (
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border-subtle">
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Invoice #</th>
                        <th className="text-left py-2 text-xs text-muted-foreground font-mono-tech uppercase">Status</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Total</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Balance</th>
                        <th className="text-right py-2 text-xs text-muted-foreground font-mono-tech uppercase">Due</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border-subtle">
                        {detail.invoices.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">No invoices</td></tr>}
                        {detail.invoices.map((i: any) => (
                          <tr key={i.id}>
                            <td className="py-2 font-mono-tech text-xs text-primary">{i.invoice_number}</td>
                            <td className="py-2"><span className={`px-2 py-0.5 text-[10px] rounded font-mono-tech ${STATUS_STYLE[i.status] || ""}`}>{i.status}</span></td>
                            <td className="py-2 text-right font-mono text-xs">{formatCurrencySync(i.total_amount, sym, false)}</td>
                            <td className="py-2 text-right font-mono text-xs text-yellow-400">{formatCurrencySync(i.balance, sym, false)}</td>
                            <td className="py-2 text-right text-xs text-muted-foreground">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-end px-6 py-4 border-t border-border-subtle">
                  <button onClick={() => { openEdit(detail.customer); setDetail(null); }}
                    className="flex items-center gap-2 h-9 px-4 border border-border-subtle text-sm text-muted-foreground hover:text-foreground">
                    <Edit2 size={14} /> Edit Customer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
