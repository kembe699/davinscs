import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useParams, useNavigate, Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import {
  ArrowLeft, Edit2, Trash2, Save, X, Plus, ShoppingBag,
  Receipt, UserCheck, CreditCard, Phone, Mail, MapPin, Clock,
  FileText, TrendingUp
} from "lucide-react";

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
  regular:    "bg-gray-500/10 text-gray-400 border border-gray-500/30",
  credit:     "bg-orange-500/10 text-orange-400 border border-orange-500/30",
};

type Tab = "orders" | "pos" | "invoices";

export default function CustomerDetail() {
  const { toast } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.customers.get(Number(id));
      setData(result);
      setForm({
        name: result.customer.name,
        email: result.customer.email || "",
        phone: result.customer.phone || "",
        address: result.customer.address || "",
        city: result.customer.city || "",
        postal_code: result.customer.postal_code || "",
        country: result.customer.country || "",
        credit_limit: result.customer.credit_limit || 0,
        payment_terms: result.customer.payment_terms || 30,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.customers.update(Number(id), form);
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete customer "${data?.customer?.name}"? This cannot be undone.`)) return;
    try {
      await api.customers.delete(Number(id));
      navigate("/admin/customers");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Delete failed", "error", "Error");
    }
  };

  const createQuotation = () => {
    if (!data) return;
    const c = data.customer;
    const params = new URLSearchParams({
      customer_id: c.id,
      customer_name: c.name,
      customer_email: c.email || "",
      customer_phone: c.phone || "",
    });
    navigate(`/admin/quotations?new=1&${params}`);
  };

  if (loading) return (
    <AdminLayout>
      <div className="p-8 text-muted-foreground text-sm animate-pulse">Loading customer…</div>
    </AdminLayout>
  );

  if (error || !data) return (
    <AdminLayout>
      <div className="p-8">
        <p className="text-red-400 text-sm mb-4">{error || "Customer not found"}</p>
        <Link to="/admin/customers" className="text-primary text-sm hover:underline">← Back to Customers</Link>
      </div>
    </AdminLayout>
  );

  const { customer, orders, posOrders, invoices } = data;

  const totalOrders = (orders?.length || 0) + (posOrders?.length || 0);
  const totalSpent = [
    ...( orders || []).map((o: any) => Number(o.total_amount || 0)),
    ...(posOrders || []).map((o: any) => Number(o.total_amount || 0)),
  ].reduce((a, b) => a + b, 0);
  const totalInvoiced = (invoices || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
  const totalBalance = (invoices || []).reduce((s: number, i: any) => s + Number(i.balance || 0), 0);

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin/customers" className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors">
              <ArrowLeft size={14} /> Customers
            </Link>
            <span className="text-border-subtle">/</span>
            <span className="text-foreground font-medium">{customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={createQuotation}
              className="flex items-center gap-2 h-9 px-4 border border-border-subtle text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FileText size={13} /> New Quote
            </button>
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 h-9 px-4 border border-border-subtle text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Edit2 size={13} /> Edit
            </button>
            <button onClick={handleDelete}
              className="flex items-center gap-2 h-9 px-4 border border-red-500/30 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Customer card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Info */}
          <div className="lg:col-span-2 border border-border-subtle bg-chassis p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <UserCheck size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                <p className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest">
                  Customer #{customer.id}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail size={13} className="text-primary shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone size={13} className="text-primary shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {(customer.address || customer.city) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
                  <MapPin size={13} className="text-primary shrink-0" />
                  <span>{[customer.address, customer.city, customer.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard size={13} className="text-primary shrink-0" />
                <span>Credit Limit: <span className="text-foreground font-mono">{formatCurrencySync(customer.credit_limit || 0, sym, false)}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={13} className="text-primary shrink-0" />
                <span>Payment Terms: <span className="text-foreground">{customer.payment_terms || 30} days</span></span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              { label: "Total Transactions", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
              { label: "Total Spent", value: formatCurrencySync(totalSpent, sym, false), icon: TrendingUp, color: "text-green-400" },
              { label: "Total Invoiced", value: formatCurrencySync(totalInvoiced, sym, false), icon: Receipt, color: "text-blue-400" },
              { label: "Outstanding Balance", value: formatCurrencySync(totalBalance, sym, false), icon: CreditCard, color: "text-yellow-400" },
            ].map(s => (
              <div key={s.label} className="border border-border-subtle bg-chassis p-4">
                <s.icon size={14} className={`${s.color} mb-2`} />
                <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-mono-tech uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border border-border-subtle">
          <div className="flex border-b border-border-subtle">
            {([
              { id: "orders" as Tab, label: "Web Orders", count: orders?.length || 0, icon: ShoppingBag },
              { id: "pos" as Tab, label: "POS Sales", count: posOrders?.length || 0, icon: ShoppingBag },
              { id: "invoices" as Tab, label: "Invoices", count: invoices?.length || 0, icon: Receipt },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                <tab.icon size={14} />
                {tab.label}
                <span className={`text-[10px] font-mono-tech px-1.5 py-0.5 rounded ${activeTab === tab.id ? "bg-primary/10" : "bg-chassis"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Web Orders */}
          {activeTab === "orders" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  {["Order #", "Status", "Amount", "Date"].map(h => (
                    <th key={h} className={`px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest ${h === "Amount" || h === "Date" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(!orders || orders.length === 0) ? (
                  <tr><td colSpan={4} className="px-6 py-10 text-center text-muted-foreground text-sm">No web orders found</td></tr>
                ) : orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-6 py-4 font-mono-tech text-xs text-primary">{o.order_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[10px] rounded font-mono-tech ${STATUS_STYLE[o.status] || ""}`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{formatCurrencySync(o.total_amount, sym, false)}</td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* POS Sales */}
          {activeTab === "pos" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  {["Sale #", "Type", "Payment", "Amount", "Date"].map(h => (
                    <th key={h} className={`px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest ${h === "Amount" || h === "Date" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(!posOrders || posOrders.length === 0) ? (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground text-sm">No POS sales found</td></tr>
                ) : posOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-6 py-4 font-mono-tech text-xs text-primary">{o.order_number}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[10px] rounded font-mono-tech ${STATUS_STYLE[o.sale_type] || STATUS_STYLE.regular}`}>{o.sale_type || "regular"}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{o.payment_type_name || "—"}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs">{formatCurrencySync(o.total_amount, sym, false)}</td>
                    <td className="px-6 py-4 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Invoices */}
          {activeTab === "invoices" && (
            <div>
              <div className="flex justify-end px-6 py-3 border-b border-border-subtle">
                <Link to="/admin/invoices"
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus size={12} /> Create Invoice
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    {["Invoice #", "Status", "Total", "Paid", "Balance", "Due Date"].map(h => (
                      <th key={h} className={`px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest ${["Total","Paid","Balance","Due Date"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {(!invoices || invoices.length === 0) ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground text-sm">No invoices found</td></tr>
                  ) : invoices.map((i: any) => (
                    <tr key={i.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-6 py-4 font-mono-tech text-xs text-primary">{i.invoice_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] rounded font-mono-tech ${STATUS_STYLE[i.status] || ""}`}>{i.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs">{formatCurrencySync(i.total_amount, sym, false)}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-green-400">{formatCurrencySync(i.paid_amount || 0, sym, false)}</td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-yellow-400">{formatCurrencySync(i.balance || 0, sym, false)}</td>
                      <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                        {i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border-subtle w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <h2 className="font-bold text-foreground">Edit Customer</h2>
              <button onClick={() => setEditing(false)}><X size={16} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {error && <p className="col-span-2 text-red-400 text-sm">{error}</p>}
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Name *</label>
                <input className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              {(["email","phone","address","city","postal_code","country"] as const).map(field => (
                <div key={field}>
                  <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">{field.replace("_"," ")}</label>
                  <input className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                    value={form[field] || ""} onChange={e => setForm((f: any) => ({ ...f, [field]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Credit Limit ({sym})</label>
                <input type="number" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.credit_limit} onChange={e => setForm((f: any) => ({ ...f, credit_limit: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-widest font-mono-tech">Payment Terms (days)</label>
                <input type="number" className="w-full h-10 px-3 bg-background border border-border-subtle text-foreground text-sm focus:outline-none focus:border-primary"
                  value={form.payment_terms} onChange={e => setForm((f: any) => ({ ...f, payment_terms: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-subtle">
              <button onClick={() => setEditing(false)} className="h-9 px-4 text-sm border border-border-subtle text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-9 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50">
                <Save size={13} /> {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
