import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign, RefreshCw, Download } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";

function today() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split("T")[0];
}

export default function CashflowReport() {
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/cashflow?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("cms_token")}` } }
      );
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (v: number) => formatCurrencySync(v, sym, false);
  const s = data?.summary;

  const exportCSV = () => {
    if (!data?.daily?.length) return;
    const header = "Date,Sales In,Refunds Out,Manual In,Manual Out,Total In,Total Out,Net";
    const rows = data.daily.map((d: any) =>
      `${d.date},${d.sales_in},${d.refunds_out},${d.manual_in},${d.manual_out},${d.total_in},${d.total_out},${d.net}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `cashflow_${startDate}_${endDate}.csv`; a.click();
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-admin-text tracking-tight">Cashflow Report</h1>
            <p className="text-sm text-admin-text-secondary mt-0.5">Track all cash movements — sales, refunds, and manual entries</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary" />
            <span className="text-admin-text-secondary text-sm">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm focus:outline-none focus:border-primary" />
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Apply"}
            </button>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {s && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: "Total Cash In",    value: s.total_in,    color: "text-admin-success", icon: TrendingUp },
              { label: "Total Cash Out",   value: s.total_out,   color: "text-admin-danger",  icon: TrendingDown },
              { label: "Net Cashflow",     value: s.net,         color: s.net >= 0 ? "text-admin-success" : "text-admin-danger", icon: DollarSign },
              { label: "POS Sales",        value: s.sales_in,    color: "text-primary", icon: TrendingUp },
              { label: "Refunds Out",      value: s.refunds_out, color: "text-admin-danger",  icon: TrendingDown },
              { label: "Manual Movements", value: s.manual_in - s.manual_out, color: "text-admin-text", icon: DollarSign },
            ].map(card => (
              <div key={card.label} className="bg-admin-surface border border-admin-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-admin-text-secondary uppercase tracking-widest">{card.label}</p>
                  <card.icon size={14} className={card.color} />
                </div>
                <p className={`text-lg font-mono font-bold ${card.color}`}>{fmt(card.value)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Daily Breakdown */}
        <div className="bg-admin-surface border border-admin-border">
          <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
            <h2 className="font-mono text-[10px] text-primary tracking-[0.3em] uppercase">Daily Breakdown</h2>
            <span className="text-xs text-admin-text-secondary">{data?.daily?.length || 0} days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-admin-bg border-b border-admin-border">
                <tr>
                  {["Date","POS Sales In","Refunds Out","Manual In","Manual Out","Total In","Total Out","Net"].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider ${h === "Date" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(!data?.daily?.length) && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-admin-text-secondary">No data for selected period</td></tr>
                )}
                {data?.daily?.map((d: any) => (
                  <tr key={d.date} className="border-b border-admin-border hover:bg-admin-bg">
                    <td className="px-4 py-3 font-mono text-admin-text">{d.date}</td>
                    <td className="px-4 py-3 text-right font-mono text-admin-success">{d.sales_in > 0 ? fmt(d.sales_in) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-admin-danger">{d.refunds_out > 0 ? fmt(d.refunds_out) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-admin-success">{d.manual_in > 0 ? fmt(d.manual_in) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-admin-danger">{d.manual_out > 0 ? fmt(d.manual_out) : "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-admin-success">{fmt(d.total_in)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-admin-danger">{fmt(d.total_out)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${d.net >= 0 ? "text-admin-success" : "text-admin-danger"}`}>
                      {d.net >= 0 ? "+" : ""}{fmt(d.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {data?.daily?.length > 0 && s && (
                <tfoot className="bg-admin-bg border-t-2 border-primary/30">
                  <tr>
                    <td className="px-4 py-3 font-bold text-admin-text text-sm uppercase tracking-wider">TOTAL</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-success">{fmt(s.sales_in)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-danger">{fmt(s.refunds_out)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-success">{fmt(s.manual_in)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-danger">{fmt(s.manual_out)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-success">{fmt(s.total_in)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-admin-danger">{fmt(s.total_out)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-lg ${s.net >= 0 ? "text-admin-success" : "text-admin-danger"}`}>
                      {s.net >= 0 ? "+" : ""}{fmt(s.net)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Cash Drawer Sessions */}
        {data?.sessions?.length > 0 && (
          <div className="bg-admin-surface border border-admin-border">
            <div className="px-6 py-4 border-b border-admin-border">
              <h2 className="font-mono text-[10px] text-primary tracking-[0.3em] uppercase">Cash Drawer Sessions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    {["Cashier","Opened At","Closed At","Opening","Closing","Expected","Difference","Status"].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-admin-text-secondary uppercase tracking-wider ${["Cashier","Opened At","Closed At","Status"].includes(h) ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((s: any) => (
                    <tr key={s.id} className="border-b border-admin-border hover:bg-admin-bg">
                      <td className="px-4 py-3 text-admin-text">{s.user_email}</td>
                      <td className="px-4 py-3 text-admin-text-secondary text-xs">{new Date(s.opened_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-admin-text-secondary text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(s.opening_cash)}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.closing_cash ? fmt(s.closing_cash) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono">{s.expected_cash ? fmt(s.expected_cash) : "—"}</td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${!s.cash_difference ? "text-admin-text-secondary" : s.cash_difference >= 0 ? "text-admin-success" : "text-admin-danger"}`}>
                        {s.cash_difference != null ? (s.cash_difference >= 0 ? "+" : "") + fmt(s.cash_difference) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-bold ${s.status === "open" ? "bg-admin-success/20 text-admin-success" : "bg-admin-border text-admin-text-secondary"}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
