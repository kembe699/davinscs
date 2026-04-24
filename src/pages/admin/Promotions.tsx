import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  Plus, Edit2, Trash2, Tag, Search, X, CheckCircle,
  Clock, AlertCircle, Calendar, Percent, DollarSign, ToggleLeft, ToggleRight,
} from "lucide-react";
import { api, Promotion } from "@/lib/api";
import AdminLayout from "./AdminLayout";

// ─── helpers ──────────────────────────────────────────────────────────────────

type DiscountType = "percentage" | "fixed";
type FilterTab   = "all" | "active" | "scheduled" | "expired";

const today = () => new Date().toISOString().slice(0, 10);

function promoStatus(p: Promotion): "active" | "scheduled" | "expired" | "inactive" {
  if (!p.is_active) return "inactive";
  const now = today();
  if (p.start_date && p.start_date > now) return "scheduled";
  if (p.end_date   && p.end_date   < now) return "expired";
  return "active";
}

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  scheduled: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  expired:   "bg-red-500/15 text-red-400 border border-red-500/30",
  inactive:  "bg-admin-border/40 text-admin-text-secondary border border-admin-border",
};

function fmtDiscount(p: Promotion) {
  return p.discount_type === "percentage"
    ? `${p.discount_value}%`
    : `UGX ${Number(p.discount_value).toLocaleString()}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── empty form ───────────────────────────────────────────────────────────────

const emptyForm = {
  name:           "",
  description:    "",
  discount_type:  "percentage" as DiscountType,
  discount_value: "" as string | number,
  start_date:     "",
  end_date:       "",
  is_active:      true,
};

// ─── component ────────────────────────────────────────────────────────────────

export default function Promotions() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState<FilterTab>("all");

  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [form,       setForm]       = useState(emptyForm);
  const [formError,  setFormError]  = useState("");

  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  // ── load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const data = await api.promotions.list();
      setPromotions(data);
    } catch {
      setError("Failed to load promotions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all       = promotions.length;
    const active    = promotions.filter(p => promoStatus(p) === "active").length;
    const scheduled = promotions.filter(p => promoStatus(p) === "scheduled").length;
    const expired   = promotions.filter(p => promoStatus(p) === "expired").length;
    return { all, active, scheduled, expired };
  }, [promotions]);

  // ── filtered ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = promotions;
    if (tab === "active")    list = list.filter(p => promoStatus(p) === "active");
    if (tab === "scheduled") list = list.filter(p => promoStatus(p) === "scheduled");
    if (tab === "expired")   list = list.filter(p => promoStatus(p) === "expired" || promoStatus(p) === "inactive");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q));
    }
    return list;
  }, [promotions, tab, search]);

  // ── modal helpers ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm({
      name:           p.name,
      description:    p.description || "",
      discount_type:  p.discount_type as DiscountType,
      discount_value: p.discount_value,
      start_date:     p.start_date ? p.start_date.slice(0, 10) : "",
      end_date:       p.end_date   ? p.end_date.slice(0, 10)   : "",
      is_active:      p.is_active,
    });
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setFormError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim())       { setFormError("Name is required."); return; }
    if (form.discount_value === "" || Number(form.discount_value) < 0) {
      setFormError("Discount value must be 0 or more."); return;
    }
    if (form.discount_type === "percentage" && Number(form.discount_value) > 100) {
      setFormError("Percentage discount cannot exceed 100%."); return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setFormError("End date must be on or after start date."); return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        ...form,
        discount_value: Number(form.discount_value),
        start_date: form.start_date || null,
        end_date:   form.end_date   || null,
      };
      if (editingId) {
        await api.promotions.update(editingId, payload);
        toast("Promotion updated successfully!", "success", "Saved");
      } else {
        await api.promotions.create(payload);
        toast("Promotion created successfully!", "success", "Saved");
      }
      closeModal();
      load();
    } catch (err: any) {
      setFormError(err.message || "Failed to save promotion.");
    } finally {
      setSaving(false);
    }
  };

  // ── toggle active ─────────────────────────────────────────────────────────
  const toggleActive = async (p: Promotion) => {
    try {
      await api.promotions.update(p.id, { ...p, is_active: !p.is_active });
      load();
    } catch {
      toast("Failed to update promotion.", "error", "Error");
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.promotions.delete(deleteId);
      setDeleteId(null);
      load();
    } catch {
      toast("Failed to delete promotion.", "error", "Error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-admin-text tracking-tight">Promotions</h1>
            <p className="text-sm text-admin-text-secondary mt-0.5">Manage discounts and promotional campaigns</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-admin-text text-admin-bg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            New Promotion
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total",     value: stats.all,       icon: Tag,          color: "text-admin-text" },
            { label: "Active",    value: stats.active,    icon: CheckCircle,  color: "text-emerald-400" },
            { label: "Scheduled", value: stats.scheduled, icon: Clock,        color: "text-blue-400" },
            { label: "Expired",   value: stats.expired,   icon: AlertCircle,  color: "text-red-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-admin-surface border border-admin-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-admin-text-secondary uppercase tracking-widest font-mono">{label}</span>
                <Icon size={16} className={color} />
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex items-center gap-4">
          <div className="flex border border-admin-border overflow-hidden">
            {(["all","active","scheduled","expired"] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium uppercase tracking-widest capitalize transition-colors ${
                  tab === t
                    ? "bg-admin-text text-admin-bg"
                    : "bg-admin-surface text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search promotions…"
              className="w-full pl-9 pr-8 py-2 bg-admin-surface border border-admin-border text-sm text-admin-text placeholder:text-admin-text-secondary focus:outline-none focus:border-admin-text"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-secondary hover:text-admin-text">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-admin-surface border border-admin-border overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-admin-text-secondary text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Tag size={32} className="mx-auto text-admin-border" />
              <p className="text-admin-text-secondary text-sm">
                {search || tab !== "all" ? "No promotions match your filter." : "No promotions yet. Create one to get started."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-admin-bg border-b border-admin-border">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Valid From</th>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Valid Until</th>
                  <th className="text-left px-4 py-3 font-medium text-admin-text">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-admin-text">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {filtered.map(p => {
                  const status = promoStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-admin-bg transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-admin-text">{p.name}</div>
                        {p.description && (
                          <div className="text-xs text-admin-text-secondary mt-0.5 max-w-xs truncate">{p.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-admin-text-secondary capitalize">
                          {p.discount_type === "percentage"
                            ? <Percent size={13} className="text-admin-text-secondary" />
                            : <DollarSign size={13} className="text-admin-text-secondary" />}
                          {p.discount_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-admin-text">{fmtDiscount(p)}</td>
                      <td className="px-4 py-3 text-admin-text-secondary">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {fmtDate(p.start_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-text-secondary">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {fmtDate(p.end_date)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-sm capitalize ${STATUS_STYLE[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* toggle active */}
                          <button
                            onClick={() => toggleActive(p)}
                            title={p.is_active ? "Deactivate" : "Activate"}
                            className={`p-1.5 rounded transition-colors ${
                              p.is_active
                                ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                : "text-admin-border hover:text-admin-text hover:bg-admin-bg"
                            }`}
                          >
                            {p.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-text hover:bg-admin-bg rounded transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="p-1.5 text-admin-text-secondary hover:text-admin-danger hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-admin-text-secondary">
          {filtered.length} of {promotions.length} promotion{promotions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border w-full max-w-md shadow-2xl">
            {/* modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
              <h2 className="text-lg font-bold text-admin-text">
                {editingId ? "Edit Promotion" : "New Promotion"}
              </h2>
              <button onClick={closeModal} className="text-admin-text-secondary hover:text-admin-text">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 flex items-center gap-2">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Summer Sale 20%"
                  required
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text placeholder:text-admin-text-secondary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description for internal notes"
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text placeholder:text-admin-text-secondary resize-none"
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                    Discount Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as DiscountType, discount_value: "" }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (UGX)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                    {form.discount_type === "percentage" ? "Percentage %" : "Amount (UGX)"} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary text-sm">
                      {form.discount_type === "percentage" ? "%" : "UGX"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={form.discount_type === "percentage" ? 100 : undefined}
                      step={form.discount_type === "percentage" ? "0.01" : "1"}
                      value={form.discount_value}
                      onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                      placeholder={form.discount_type === "percentage" ? "10" : "5000"}
                      required
                      className="w-full pl-10 pr-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text placeholder:text-admin-text-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-text-secondary uppercase tracking-widest mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || undefined}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-admin-text"
                  />
                </div>
              </div>
              <p className="text-xs text-admin-text-secondary -mt-1">Leave dates blank for an open-ended promotion.</p>

              {/* Active toggle */}
              <div
                className="flex items-center justify-between py-2 px-3 bg-admin-bg border border-admin-border cursor-pointer select-none"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              >
                <div>
                  <p className="text-sm font-medium text-admin-text">Active</p>
                  <p className="text-xs text-admin-text-secondary">Inactive promotions are never applied at checkout</p>
                </div>
                <div className={`transition-colors ${form.is_active ? "text-emerald-400" : "text-admin-border"}`}>
                  {form.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-admin-text text-admin-bg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saving ? "Saving…" : editingId ? "Save Changes" : "Create Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border w-full max-w-sm shadow-2xl">
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-admin-text">Delete Promotion</h3>
                  <p className="text-sm text-admin-text-secondary mt-0.5">
                    {(() => {
                      const p = promotions.find(x => x.id === deleteId);
                      return p ? `"${p.name}" will be permanently deleted.` : "This promotion will be permanently deleted.";
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
