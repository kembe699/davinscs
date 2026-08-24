import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { Plus, Search, Trash2, Edit2, X, ChevronRight } from "lucide-react";

const emptyForm = {
  name: "", email: "", phone: "", address: "", city: "",
  postal_code: "", country: "", credit_limit: 0, payment_terms: 30,
};

export default function Customers() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";
  const navigate = useNavigate();
  const tp = useTenantPath();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);

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
        toast("Customer updated successfully!", "success", "Saved");
      } else {
        await api.customers.create(form);
        toast("Customer added successfully!", "success", "Saved");
      }
      setShowForm(false);
      load(search || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setPendingConfirm({
      message: "Delete this customer? This cannot be undone.",
      action: async () => {
        try {
          await api.customers.delete(id);
          setCustomers(cs => cs.filter(c => c.id !== id));
        } catch (err) {
          toast(err instanceof Error ? err.message : "Delete failed", "error", "Error");
        }
      },
    });
  };

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
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
                  <tr key={c.id}
                    onClick={() => navigate(tp(`/admin/customers/${c.id}`))}
                    className="hover:bg-chassis/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city || "—"}</td>
                    <td className="px-4 py-3 text-right text-primary font-mono-tech text-xs">{c.order_count || 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{formatCurrencySync(Number(c.total_spent || 0), sym, true)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-yellow-400">{formatCurrencySync(Number(c.balance || 0), sym, true)}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate(tp(`/admin/customers/${c.id}`))} className="p-1 text-muted-foreground hover:text-primary transition-colors"><ChevronRight size={14} /></button>
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
            <div className="p-4 sm:p-6 grid grid-cols-2 gap-4">
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

      <ConfirmDialog
        open={!!pendingConfirm}
        title="Delete Customer"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
