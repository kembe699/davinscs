import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Download, ShieldAlert, LogIn, ShoppingCart, DollarSign, Package, Users, Building, X } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface AuditEntry {
  id: number;
  user_id: number | null;
  user_email: string;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: any;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN:                "bg-blue-500/20 text-blue-400",
  LOGIN_FAILED:         "bg-red-500/20 text-red-400",
  SALE_CREATED:         "bg-emerald-500/20 text-emerald-400",
  SALE_VOIDED:          "bg-orange-500/20 text-orange-400",
  SALE_REFUNDED:        "bg-yellow-500/20 text-yellow-400",
  CASH_SESSION_OPENED:  "bg-teal-500/20 text-teal-400",
  CASH_SESSION_CLOSED:  "bg-slate-500/20 text-slate-400",
  CASH_IN:              "bg-green-500/20 text-green-400",
  CASH_OUT:             "bg-red-500/20 text-red-400",
  PRODUCT_CREATED:      "bg-purple-500/20 text-purple-400",
  PRODUCT_UPDATED:      "bg-indigo-500/20 text-indigo-400",
  PRODUCT_DELETED:      "bg-rose-500/20 text-rose-400",
  USER_CREATED:         "bg-cyan-500/20 text-cyan-400",
  USER_UPDATED:         "bg-sky-500/20 text-sky-400",
  USER_DELETED:         "bg-rose-500/20 text-rose-400",
  COMPANY_UPDATED:      "bg-violet-500/20 text-violet-400",
};

const FIELD_LABELS: Record<string, string> = {
  sale_number:      "Sale #",
  total_amount:     "Amount",
  items_count:      "Items",
  sale_type:        "Type",
  payment_type_id:  "Payment ID",
  opening_cash:     "Opening",
  closing_cash:     "Closing",
  expected_cash:    "Expected",
  cash_difference:  "Difference",
  amount:           "Amount",
  reason:           "Reason",
  name:             "Name",
  price:            "Price",
  category:         "Category",
  sku:              "SKU",
  email:            "Email",
  role:             "Role",
  role_id:          "Role ID",
  password_changed: "Pwd Changed",
};

const MONEY_FIELDS = new Set(["total_amount", "opening_cash", "closing_cash", "expected_cash", "cash_difference", "amount", "price"]);

function DetailsBadges({ details }: { details: any }) {
  if (!details || typeof details !== "object") return <span className="text-admin-text-secondary">—</span>;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return <span className="text-admin-text-secondary">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => {
        const label = FIELD_LABELS[k] || k.replace(/_/g, " ");
        const isMoney = MONEY_FIELDS.has(k);
        const display = isMoney
          ? Number(v).toLocaleString()
          : typeof v === "boolean"
          ? (v ? "yes" : "no")
          : String(v);
        return (
          <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-admin-bg border border-admin-border text-[10px] rounded-sm">
            <span className="text-admin-text-secondary">{label}:</span>
            <span className="font-semibold text-admin-text">{display}</span>
          </span>
        );
      })}
    </div>
  );
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  LOGIN:               LogIn,
  LOGIN_FAILED:        ShieldAlert,
  SALE_CREATED:        ShoppingCart,
  SALE_VOIDED:         ShoppingCart,
  SALE_REFUNDED:       ShoppingCart,
  CASH_SESSION_OPENED: DollarSign,
  CASH_SESSION_CLOSED: DollarSign,
  CASH_IN:             DollarSign,
  CASH_OUT:            DollarSign,
  PRODUCT_CREATED:     Package,
  PRODUCT_UPDATED:     Package,
  PRODUCT_DELETED:     Package,
  USER_CREATED:        Users,
  USER_UPDATED:        Users,
  USER_DELETED:        Users,
  COMPANY_UPDATED:     Building,
};

function today() { return new Date().toISOString().split("T")[0]; }
function sevenDaysAgo() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 100;

  // Filters
  const [startDate, setStartDate]   = useState(sevenDaysAgo());
  const [endDate, setEndDate]       = useState(today());
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [allActions, setAllActions] = useState<string[]>([]);
  const [allUsers, setAllUsers]     = useState<string[]>([]);
  const [selected, setSelected]     = useState<AuditEntry | null>(null);

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("cms_token")}` });

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: startDate, end_date: endDate,
        page: String(p), limit: String(LIMIT),
      });
      if (filterUser)   params.set("user_email", filterUser);
      if (filterAction) params.set("action", filterAction);

      const res = await fetch(`/api/audit-logs?${params}`, { headers: authHeader() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEntries(json.rows || []);
      setTotal(json.total || 0);
      setPage(p);
    } catch (e) { console.error('[audit] load error:', e); }
    finally { setLoading(false); }
  }, [startDate, endDate, filterUser, filterAction]);

  const loadMeta = useCallback(() => {
    fetch("/api/audit-logs/actions", { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(setAllActions)
      .catch(() => {});
    fetch("/api/audit-logs/users", { headers: authHeader() })
      .then(r => r.ok ? r.json() : [])
      .then(setAllUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMeta();
    load(1);
  }, [loadMeta, load]);

  const exportCSV = () => {
    const header = "ID,User,Action,Entity Type,Entity ID,IP,Timestamp,Details";
    const rows = entries.map(e =>
      `${e.id},"${e.user_email}","${e.action}","${e.entity_type || ""}",${e.entity_id || ""},"${e.ip_address || ""}","${new Date(e.created_at).toISOString()}","${JSON.stringify(e.details || {}).replace(/"/g, "'")}"`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `audit_trail_${startDate}_${endDate}.csv`; a.click();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-admin-text tracking-tight">Audit Trail</h1>
            <p className="text-sm text-admin-text-secondary mt-0.5">Complete log of every user action — who did what and when</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-admin-surface border border-admin-border p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-admin-text-secondary mb-1 uppercase tracking-wider">From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-admin-text-secondary mb-1 uppercase tracking-wider">To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-admin-text-secondary mb-1 uppercase tracking-wider">User</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary min-w-[180px]">
              <option value="">All Users</option>
              {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-admin-text-secondary mb-1 uppercase tracking-wider">Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary min-w-[180px]">
              <option value="">All Actions</option>
              {allActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={() => load(1)} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Search"}
          </button>
          {(filterUser || filterAction) && (
            <button onClick={() => { setFilterUser(""); setFilterAction(""); }}
              className="flex items-center gap-1 px-3 py-2 border border-admin-border text-admin-text-secondary text-sm hover:text-admin-text">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-admin-text-secondary">
          <span><span className="font-semibold text-admin-text">{total.toLocaleString()}</span> total entries</span>
          <span>Page <span className="font-semibold text-admin-text">{page}</span> of <span className="font-semibold text-admin-text">{totalPages || 1}</span></span>
        </div>

        {/* Table */}
        <div className="bg-admin-surface border border-admin-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-admin-bg border-b border-admin-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider w-44">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-admin-text-secondary">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading audit log…
                  </td></tr>
                )}
                {!loading && entries.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-admin-text-secondary">No audit entries found for the selected filters.</td></tr>
                )}
                {!loading && entries.map(entry => {
                  const ActionIcon = ACTION_ICONS[entry.action] || ShieldAlert;
                  const colorClass = ACTION_COLORS[entry.action] || "bg-admin-border/30 text-admin-text-secondary";
                  return (
                    <tr key={entry.id}
                      onClick={() => setSelected(entry)}
                      className="border-b border-admin-border hover:bg-admin-bg cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-admin-text-secondary whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-admin-text">{entry.user_email || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded-sm ${colorClass}`}>
                          <ActionIcon size={10} />
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-admin-text-secondary text-xs">
                        {entry.entity_type ? (
                          <span>{entry.entity_type}{entry.entity_id ? ` #${entry.entity_id}` : ""}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <DetailsBadges details={entry.details} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-admin-text-secondary">{entry.ip_address || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-admin-border bg-admin-bg">
              <button onClick={() => load(page - 1)} disabled={page <= 1 || loading}
                className="px-4 py-1.5 border border-admin-border text-sm text-admin-text hover:bg-admin-surface disabled:opacity-40">
                ← Previous
              </button>
              <span className="text-sm text-admin-text-secondary">Page {page} / {totalPages}</span>
              <button onClick={() => load(page + 1)} disabled={page >= totalPages || loading}
                className="px-4 py-1.5 border border-admin-border text-sm text-admin-text hover:bg-admin-surface disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-admin-surface border border-admin-border w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-admin-text text-lg">Audit Entry #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-admin-text-secondary hover:text-admin-text"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Timestamp", new Date(selected.created_at).toLocaleString()],
                ["User",      selected.user_email || "—"],
                ["Action",    selected.action],
                ["Entity",    selected.entity_type ? `${selected.entity_type} #${selected.entity_id || ""}` : "—"],
                ["IP Address",selected.ip_address || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-admin-text-secondary w-24 shrink-0">{k}</span>
                  <span className="text-admin-text font-medium">{v}</span>
                </div>
              ))}
              {selected.details && Object.keys(selected.details).length > 0 && (
                <div className="border-t border-admin-border pt-3 mt-1">
                  <p className="text-admin-text-secondary text-xs uppercase tracking-wider mb-2">Details</p>
                  <div className="space-y-2">
                    {Object.entries(selected.details)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "")
                      .map(([k, v]) => {
                        const label = FIELD_LABELS[k] || k.replace(/_/g, " ");
                        const isMoney = MONEY_FIELDS.has(k);
                        const display = isMoney
                          ? Number(v).toLocaleString()
                          : typeof v === "boolean"
                          ? (v ? "Yes" : "No")
                          : String(v);
                        return (
                          <div key={k} className="flex items-center gap-3">
                            <span className="text-admin-text-secondary w-32 shrink-0 capitalize">{label}</span>
                            <span className="font-semibold text-admin-text">{display}</span>
                          </div>
                        );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
