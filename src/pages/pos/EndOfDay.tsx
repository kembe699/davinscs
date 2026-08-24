import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import { openPrintWindow, companyHeaderHTML, downloadDocument } from "@/utils/printUtils";
import {
  ArrowLeft, Printer, RefreshCw, Lock, AlertCircle,
  ShoppingBag, DollarSign, Tag, Receipt, TrendingUp, TrendingDown, Package, Users, Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api, CashDrawerSession } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";

export default function EndOfDay() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport]             = useState<any>(null);
  const [hourly, setHourly]             = useState<any[]>([]);
  const [session, setSession]           = useState<CashDrawerSession | null>(null);
  const [movements, setMovements]       = useState<any[]>([]);
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [companyData, setCompanyData]   = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // Close shift state
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCash, setClosingCash]       = useState("");
  const [closeNotes, setCloseNotes]         = useState("");
  const [closing, setClosing]               = useState(false);
  const [closeResult, setCloseResult]       = useState<any>(null);

  useEffect(() => {
    loadAll();
    // Background refresh only — must NOT flip `loading` back to true, or the
    // whole report blanks out to the "Loading report…" placeholder every 10
    // seconds even though nothing actually changed most of the time.
    const intervalId = setInterval(() => {
      loadAll({ background: true });
    }, 10000);
    return () => clearInterval(intervalId);
  }, [selectedDate]);

  const loadAll = async ({ background = false }: { background?: boolean } = {}) => {
    if (!background) setLoading(true);
    setError("");
    try {
      const [eod, hrs, company] = await Promise.all([
        api.posReports.endOfDay({ date: selectedDate }),
        api.posReports.hourlySales({ date: selectedDate }),
        api.company.get().catch(() => null),
      ]);
      setReport(eod);
      setHourly(Array.isArray(hrs) ? hrs : []);
      setCompanyData(company);
      // Try to load open cash drawer session, plus what's supposed to be in the
      // drawer right now (opening cash + cash sales +/- cash movements) and every
      // cash in/out recorded against it, so a cashier can see exactly why that
      // number is what it is before they close out.
      try {
        const sess = await api.cashDrawer.getCurrent();
        setSession(sess);
        if (sess?.id) {
          const [moves, expected] = await Promise.all([
            api.cashDrawer.getMovements(sess.id).catch(() => []),
            api.cashDrawer.getExpected().catch(() => null),
          ]);
          setMovements(moves);
          setExpectedCash(expected ? Number(expected.expected_cash) : null);
        } else {
          setMovements([]);
          setExpectedCash(null);
        }
      } catch {
        setSession(null);
        setMovements([]);
        setExpectedCash(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!closingCash.trim()) { toast("Enter the closing cash amount.", "warning", "Required"); return; }
    setClosing(true);
    try {
      const result = await api.cashDrawer.close(Number(closingCash), closeNotes);
      setCloseResult(result);
      setSession(null);
      setShowCloseModal(false);
      await loadAll();
    } catch (err: any) {
      toast(err.message || "Failed to close shift.", "error", "Error");
    } finally {
      setClosing(false);
    }
  };

  // Manual cash movements only — pos.js also logs an automatic "POS Sale …" cash-in
  // for every cash sale so the drawer-expected-cash math has a record of it, but
  // those aren't cash in/out events a cashier did on purpose; showing them here
  // would just be every sale of the day repeated as a "cash in" line.
  const manualMovements = movements.filter((m: any) => !String(m.reason || '').startsWith('POS Sale'));
  const cashInTotal  = manualMovements.filter((m: any) => m.type === 'in').reduce((sum: number, m: any) => sum + Number(m.amount), 0);
  const cashOutTotal = manualMovements.filter((m: any) => m.type === 'out').reduce((sum: number, m: any) => sum + Number(m.amount), 0);

  const buildEodBody = () => {
    const s = report?.sales_summary;
    const fmt = (n: number) => `${sym} ${Number(n).toLocaleString()}`;

    const paymentRows = (report?.payment_breakdown ?? [])
      .map((pm: any) =>
        `<div class="row"><span>${pm.name}</span><span>${Number(pm.count)} txn${Number(pm.count) !== 1 ? "s" : ""} — ${fmt(Number(pm.total))}</span></div>`)
      .join("") || `<p class="muted">No payment data</p>`;

    const productRows = (report?.top_products ?? [])
      .map((p: any, i: number) =>
        `<div class="row"><span>${i + 1}. ${p.product_name}</span><span>x${p.quantity} — ${fmt(Number(p.revenue))}</span></div>`)
      .join("") || `<p class="muted">No products sold</p>`;

    const hourlyRows = hourly
      .map((h: any) =>
        `<div class="row"><span>${String(h.hour).padStart(2, "0")}:00</span><span>${h.sales_count} sale${Number(h.sales_count) !== 1 ? "s" : ""} — ${fmt(Number(h.total_amount))}</span></div>`)
      .join("") || `<p class="muted">No hourly data</p>`;

    const cashierRows = (report?.cashier_breakdown ?? [])
      .map((c: any) =>
        `<div class="row"><span>${c.cashier_name}</span><span>${c.total_transactions} txn${Number(c.total_transactions) !== 1 ? "s" : ""} — ${fmt(Number(c.total_sales))}</span></div>`)
      .join("") || `<p class="muted">No cashier data</p>`;

    const paymentTable = `
      <table>
        <thead><tr><th>Payment Method</th><th class="right">Transactions</th><th class="right">Amount</th></tr></thead>
        <tbody>
          ${(report?.payment_breakdown ?? []).map((pm: any) =>
            `<tr><td>${pm.name}</td><td class="right">${pm.count}</td><td class="right">${fmt(Number(pm.total))}</td></tr>`
          ).join("") || `<tr><td colspan="3" class="muted">No payment data</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="right"><strong>${Number(s?.total_transactions ?? 0)}</strong></td>
            <td class="right"><strong>${fmt(Number(s?.total_sales ?? 0))}</strong></td>
          </tr>
        </tfoot>
      </table>`;

    const cashMovementRows = manualMovements
      .map((m: any) =>
        `<tr><td>${new Date(m.created_at).toLocaleTimeString()}</td><td>${m.type === 'in' ? 'IN' : 'OUT'}</td><td>${m.reason || '—'}</td><td class="right">${m.type === 'out' ? '-' : ''}${fmt(Number(m.amount))}</td></tr>`)
      .join("");
    const cashMovementsTable = manualMovements.length ? `
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Reason</th><th class="right">Amount</th></tr></thead>
        <tbody>${cashMovementRows}</tbody>
        <tfoot>
          <tr class="total-row"><td colspan="3"><strong>Cash In / Cash Out</strong></td><td class="right"><strong>+${fmt(cashInTotal)} / -${fmt(cashOutTotal)}</strong></td></tr>
        </tfoot>
      </table>` : "";

    const cashierTable = `
      <table>
        <thead><tr><th>Cashier</th><th class="right">Transactions</th><th class="right">Discounts</th><th class="right">Revenue</th></tr></thead>
        <tbody>
          ${(report?.cashier_breakdown ?? []).map((c: any) =>
            `<tr><td>${c.cashier_name}</td><td class="right">${c.total_transactions}</td><td class="right">-${fmt(Number(c.total_discounts))}</td><td class="right">${fmt(Number(c.total_sales))}</td></tr>`
          ).join("") || `<tr><td colspan="4" class="muted">No cashier data</td></tr>`}
        </tbody>
      </table>`;

    const productTable = `
      <table>
        <thead><tr><th>#</th><th>Product</th><th class="right">Qty</th><th class="right">Revenue</th></tr></thead>
        <tbody>
          ${(report?.top_products ?? []).map((p: any, i: number) =>
            `<tr><td>${i + 1}</td><td>${p.product_name}</td><td class="right">${p.quantity}</td><td class="right">${fmt(Number(p.revenue))}</td></tr>`
          ).join("") || `<tr><td colspan="4" class="muted">No products sold</td></tr>`}
        </tbody>
      </table>`;

    const hourlyTable = `
      <table>
        <thead><tr><th>Hour</th><th class="right">Sales</th><th class="right">Revenue</th></tr></thead>
        <tbody>
          ${hourly.map((h: any) =>
            `<tr><td>${String(h.hour).padStart(2,"0")}:00</td><td class="right">${h.sales_count}</td><td class="right">${fmt(Number(h.total_amount))}</td></tr>`
          ).join("") || `<tr><td colspan="3" class="muted">No hourly data</td></tr>`}
        </tbody>
      </table>`;

    const eodBody = `
      ${companyHeaderHTML(companyData, 'END OF DAY REPORT', selectedDate,
        `<div class="doc-date">Printed: ${new Date().toLocaleString()}</div>`)}

      <div class="summary-grid">
        <div class="summary-card"><div class="s-label">Transactions</div><div class="s-value">${Number(s?.total_transactions ?? 0)}</div></div>
        <div class="summary-card"><div class="s-label">Total Revenue</div><div class="s-value">${fmt(Number(s?.total_sales ?? 0))}</div></div>
        <div class="summary-card"><div class="s-label">Tax Collected</div><div class="s-value">${fmt(Number(s?.total_tax ?? 0))}</div></div>
        <div class="summary-card"><div class="s-label">Discounts Given</div><div class="s-value">${fmt(Number(s?.total_discounts ?? 0))}</div></div>
      </div>

      ${Number(report?.refund_summary?.count) > 0
        ? `<div style="background:#fff3e0;border:1px solid #f59e0b;padding:5px 8px;font-size:10px;margin-bottom:10px;">↩ ${report.refund_summary.count} refund(s) — ${fmt(Number(report.refund_summary.total_refunded))} refunded.</div>`
        : ""}
      ${Number(report?.voided_sales?.count) > 0
        ? `<div style="background:#fffbe6;border:1px solid #f0c000;padding:5px 8px;font-size:10px;margin-bottom:10px;">⚠ ${report.voided_sales.count} voided sale(s) totalling ${fmt(Number(report.voided_sales.total))} excluded.</div>`
        : ""}

      ${session && expectedCash != null ? `
      <div style="background:#e0f2fe;border:1px solid #0284c7;padding:6px 8px;font-size:11px;margin-bottom:10px;">
        <strong>Expected cash to submit: ${fmt(expectedCash)}</strong> (opening cash + cash sales + cash in − cash out)
      </div>` : ""}

      ${manualMovements.length ? `<div class="section-title">Cash In / Cash Out</div>${cashMovementsTable}` : ""}

      <div class="section-title">Sales by Cashier</div>
      ${cashierTable}

      <div class="two-col" style="margin-top:14px">
        <div><div class="section-title">Payment Methods</div>${paymentTable}</div>
        <div><div class="section-title">Top Products Sold</div>${productTable}</div>
      </div>

      <div class="section-title" style="margin-top:14px">Hourly Sales Breakdown</div>
      ${hourlyTable}

      <div class="footer">
        ${companyData?.name || ''} — Confidential &nbsp;|&nbsp; End of Day Report ${selectedDate}
      </div>`;

    return eodBody;
  };

  const handlePrint = () => openPrintWindow(`End of Day Report — ${selectedDate}`, buildEodBody());
  const handleDownload = () => downloadDocument(`EndOfDay_${selectedDate}`, buildEodBody());

  const ss    = report?.sales_summary;
  const maxHr = hourly.length ? Math.max(...hourly.map((h: any) => Number(h.total_amount) || 0)) : 1;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 flex flex-wrap items-center gap-3 print:hidden">
        <button
          onClick={() => navigate(tp("/pos"))}
          className="flex items-center gap-2 px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm hover:bg-white dark:bg-gray-800"
        >
          <ArrowLeft size={15} /> Back to POS
        </button>
        <h1 className="text-xl font-bold text-[#1A1A2E] dark:text-gray-100 flex-1">End of Day Report</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm"
        />
        <button onClick={loadAll} className="flex items-center gap-2 px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm hover:bg-white dark:bg-gray-800">
          <RefreshCw size={14} /> Refresh
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-admin-text text-admin-bg text-sm hover:opacity-90">
          <Printer size={14} /> Print
        </button>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700">
          <Download size={14} /> Download PDF
        </button>
        {session && (
          <button
            onClick={() => setShowCloseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
          >
            <Lock size={14} /> Close Shift
          </button>
        )}
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Close result banner */}
        {closeResult && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 text-sm flex items-center gap-2">
            <Receipt size={15} />
            Shift closed — Closing cash: {formatCurrencySync(closeResult.closing_cash, sym, false)} |
            Expected: {formatCurrencySync(closeResult.expected_cash, sym, false)} |
            Difference: {formatCurrencySync(closeResult.cash_difference, sym, false)}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {session && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 text-sm flex items-center gap-2 flex-wrap">
            <Lock size={14} />
            Cash drawer is <strong>open</strong> — opened at {new Date(session.opened_at).toLocaleTimeString()} with {formatCurrencySync(session.opening_cash, sym, false)} opening cash.
            {expectedCash != null && (
              <span className="font-bold">You should have {formatCurrencySync(expectedCash, sym, false)} in the drawer right now.</span>
            )}
            <button onClick={() => setShowCloseModal(true)} className="ml-auto underline whitespace-nowrap">Close shift →</button>
          </div>
        )}

        {loading ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading report…
          </div>
        ) : (
          /* ── Printable content ── */
          <div ref={printRef} className="space-y-6">

            {/* Report header (shows on print) */}
            <div className="hidden print:block text-center mb-4">
              <div className="text-xl font-bold">{companyData?.name || ""}</div>
              <div className="text-sm">{companyData?.address || ""}</div>
              <div className="text-lg font-bold mt-2">END OF DAY REPORT</div>
              <div className="text-sm">Date: {selectedDate}</div>
              <div className="text-sm">Printed: {new Date().toLocaleString()}</div>
              <hr className="my-2" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Transactions",    value: ss?.total_transactions ?? 0,  icon: ShoppingBag,  mono: false, color: "text-[#1A1A2E] dark:text-gray-100" },
                { label: "Total Revenue",   value: ss?.total_sales ?? 0,         icon: DollarSign,   mono: true,  color: "text-emerald-400" },
                { label: "Tax Collected",   value: ss?.total_tax ?? 0,           icon: TrendingUp,   mono: true,  color: "text-blue-400" },
                { label: "Discounts Given", value: ss?.total_discounts ?? 0,     icon: Tag,          mono: true,  color: "text-red-400" },
              ].map(({ label, value, icon: Icon, mono, color }) => (
                <div key={label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</span>
                    <Icon size={15} className={color} />
                  </div>
                  <div className={`text-2xl font-bold ${color} ${mono ? "font-mono" : ""}`}>
                    {mono ? formatCurrencySync(Number(value), sym, false) : Number(value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Refund + Voided pills */}
            <div className="flex flex-wrap gap-3">
              {Number(report?.refund_summary?.count) > 0 && (
                <div className="flex-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-3 text-sm flex items-center justify-between">
                  <span>↩ <strong>{report.refund_summary.count}</strong> refund(s) processed today</span>
                  <span className="font-mono font-bold">{formatCurrencySync(Number(report.refund_summary.total_refunded), sym, false)} refunded</span>
                </div>
              )}
              {Number(report?.voided_sales?.count) > 0 && (
                <div className="flex-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 text-sm flex items-center justify-between">
                  <span>⚠ <strong>{report.voided_sales.count}</strong> voided sale(s)</span>
                  <span className="font-mono font-bold">{formatCurrencySync(Number(report.voided_sales.total), sym, false)} voided</span>
                </div>
              )}
            </div>

            {/* Cash In / Cash Out */}
            {manualMovements.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100 flex items-center gap-2">
                    <DollarSign size={15} /> Cash In / Cash Out
                  </h2>
                  <div className="flex items-center gap-4 text-sm font-mono">
                    <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={13} /> +{formatCurrencySync(cashInTotal, sym, false)}</span>
                    <span className="text-red-400 flex items-center gap-1"><TrendingDown size={13} /> -{formatCurrencySync(cashOutTotal, sym, false)}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-[#F8F9FA] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Time</th>
                      <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Type</th>
                      <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Reason</th>
                      <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualMovements.map((m: any) => (
                      <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleTimeString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs font-bold ${m.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {m.type === 'in' ? '▲ IN' : '▼ OUT'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100">{m.reason || '—'}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${m.type === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.type === 'out' ? '-' : '+'}{formatCurrencySync(Number(m.amount), sym, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cashier breakdown */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100 flex items-center gap-2"><Users size={15} /> Sales by Cashier</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#F8F9FA] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Cashier</th>
                    <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Email</th>
                    <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Txns</th>
                    <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Discounts</th>
                    <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.cashier_breakdown?.length > 0 ? (
                    report.cashier_breakdown.map((c: any, i: number) => (
                      <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 font-medium">{c.cashier_name}</td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{c.email}</td>
                        <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 text-right">{c.total_transactions}</td>
                        <td className="px-4 py-2 text-red-400 text-right font-mono">
                          -{formatCurrencySync(Number(c.total_discounts), sym, false)}
                        </td>
                        <td className="px-4 py-2 text-emerald-400 text-right font-mono">
                          {formatCurrencySync(Number(c.total_sales), sym, false)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">No transactions recorded</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Payment breakdown + Top products (side by side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Payment breakdown */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100">Payment Methods</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-[#F8F9FA] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Method</th>
                      <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Txns</th>
                      <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.payment_breakdown?.length > 0 ? (
                      report.payment_breakdown.map((pm: any, i: number) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100">{pm.name}</td>
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 text-right">{pm.count}</td>
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 text-right font-mono">
                            {formatCurrencySync(Number(pm.total), sym, false)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">No sales recorded</td></tr>
                    )}
                  </tbody>
                  {report?.payment_breakdown?.length > 0 && (
                    <tfoot className="bg-[#F8F9FA] dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td className="px-4 py-2 font-bold text-[#1A1A2E] dark:text-gray-100">Total</td>
                        <td className="px-4 py-2 font-bold text-[#1A1A2E] dark:text-gray-100 text-right">{ss?.total_transactions ?? 0}</td>
                        <td className="px-4 py-2 font-bold text-[#1A1A2E] dark:text-gray-100 text-right font-mono">
                          {formatCurrencySync(Number(ss?.total_sales ?? 0), sym, false)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Top products */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100 flex items-center gap-2"><Package size={15} /> Top Products</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-[#F8F9FA] dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Product</th>
                      <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Qty</th>
                      <th className="text-right px-4 py-2 text-[#1A1A2E] dark:text-gray-100">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.top_products?.length > 0 ? (
                      report.top_products.map((p: any, i: number) => (
                        <tr key={i} className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 truncate max-w-[140px]">{p.product_name}</td>
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 text-right">{p.quantity}</td>
                          <td className="px-4 py-2 text-[#1A1A2E] dark:text-gray-100 text-right font-mono">
                            {formatCurrencySync(Number(p.revenue), sym, false)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">No products sold</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hourly sales bar chart */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100">Hourly Sales Breakdown</h2>
              </div>
              {hourly.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-6">No hourly data for this date</p>
              ) : (
                <div className="p-4">
                  <div className="flex items-end gap-1 h-28">
                    {Array.from({ length: 24 }, (_, h) => {
                      const entry = hourly.find((x: any) => Number(x.hour) === h);
                      const amt   = entry ? Number(entry.total_amount) : 0;
                      const cnt   = entry ? Number(entry.sales_count)  : 0;
                      const pct   = maxHr > 0 ? (amt / maxHr) * 100 : 0;
                      return (
                        <div key={h} className="flex flex-col items-center flex-1 group relative">
                          <div
                            className="w-full bg-admin-text/70 group-hover:bg-admin-text transition-colors rounded-t-sm"
                            style={{ height: `${Math.max(pct, amt > 0 ? 4 : 0)}%` }}
                          />
                          {cnt > 0 && (
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-[#1A1A2E] dark:text-gray-100 px-2 py-1 whitespace-nowrap z-10">
                              {h}:00 — {cnt} sale{cnt !== 1 ? "s" : ""}<br />{formatCurrencySync(amt, sym, false)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                  </div>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {hourly.map((h: any, i: number) => (
                      <div key={i} className="bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-2 text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{String(h.hour).padStart(2,"0")}:00</div>
                        <div className="text-sm font-bold text-[#1A1A2E] dark:text-gray-100">{h.sales_count}</div>
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                          {formatCurrencySync(Number(h.total_amount), sym, false)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Print footer */}
            <div className="hidden print:block text-center text-xs mt-6 border-t pt-4">
              <p>*** End of Day Report — {selectedDate} ***</p>
              <p>Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Close Shift Modal ─────────────────────────────────────────────── */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-bold text-[#1A1A2E] dark:text-gray-100 flex items-center gap-2"><Lock size={16} /> Close Shift</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-500 dark:text-gray-400 hover:text-[#1A1A2E] dark:text-gray-100 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {session && (
                <div className="bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Opened at</span>
                    <span className="text-[#1A1A2E] dark:text-gray-100">{new Date(session.opened_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Opening cash</span>
                    <span className="text-[#1A1A2E] dark:text-gray-100 font-mono">{formatCurrencySync(session.opening_cash, sym, false)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Sales today</span>
                    <span className="text-emerald-400 font-mono">{formatCurrencySync(Number(ss?.total_sales ?? 0), sym, false)}</span>
                  </div>
                  {cashOutTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cash out</span>
                      <span className="text-red-400 font-mono">-{formatCurrencySync(cashOutTotal, sym, false)}</span>
                    </div>
                  )}
                  {cashInTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cash in</span>
                      <span className="text-emerald-400 font-mono">+{formatCurrencySync(cashInTotal, sym, false)}</span>
                    </div>
                  )}
                  {expectedCash != null && (
                    <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-bold">
                      <span className="text-[#1A1A2E] dark:text-gray-100">You should submit</span>
                      <span className="text-[#1A1A2E] dark:text-gray-100 font-mono">{formatCurrencySync(expectedCash, sym, false)}</span>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">
                  Closing Cash Amount <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  placeholder="Enter physical cash in drawer"
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm focus:outline-none focus:border-admin-text placeholder:text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">Notes (optional)</label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  placeholder="Any notes for this shift…"
                  className="w-full px-3 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm resize-none focus:outline-none focus:border-admin-text placeholder:text-gray-500 dark:text-gray-400"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 px-4 py-2 bg-[#F8F9FA] dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-[#1A1A2E] dark:text-gray-100 text-sm hover:bg-white dark:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={closing}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {closing ? "Closing…" : "Close & Lock Shift"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
