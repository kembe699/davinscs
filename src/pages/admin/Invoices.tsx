import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { Search, FileText, Plus, X, Download, Printer, CheckCircle, Clock, AlertCircle, Ban, ChevronRight, DollarSign, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { printDocument, downloadDocument } from "@/utils/printUtils";
import CreateInvoiceModal from "./CreateInvoiceModal";

const STATUS_STYLES: Record<string, string> = {
  unpaid:  "bg-red-500/10 text-red-400 border border-red-500/30",
  partial: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
  paid:    "bg-green-500/10 text-green-400 border border-green-500/30",
  overdue: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
  voided:  "bg-gray-500/10 text-gray-400 border border-gray-500/30",
};

const STATUS_ICON: Record<string, JSX.Element> = {
  unpaid:  <AlertCircle size={12} />,
  partial: <Clock size={12} />,
  paid:    <CheckCircle size={12} />,
  overdue: <AlertCircle size={12} />,
  voided:  <Ban size={12} />,
};

function fmt(amount: number | string, sym = "UGX") {
  const n = Math.round(parseFloat(String(amount)));
  return `${sym} ${n.toLocaleString("en-US")}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.unpaid}`}>
      {STATUS_ICON[status] || STATUS_ICON.unpaid}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Invoices() {
  const { toast } = useToast();
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [companyData, setCompanyData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payNotes, setPayNotes] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  // Create invoice modal
  const [showCreate, setShowCreate] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => {
    api.company.get().then(setCompanyData).catch(() => {});
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.invoices.list({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInvoices(); }, [statusFilter, startDate, endDate]);

  const openDetail = async (inv: any) => {
    setSelected(inv);
    setLoadingDetail(true);
    try {
      const d = await api.invoices.get(inv.id);
      setDetail(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    setPayLoading(true);
    try {
      await api.invoices.recordPayment(detail.id, {
        amount: Math.round(parseFloat(payAmount) * 100),
        payment_method: payMethod,
        notes: payNotes || undefined,
      });
      setShowPayment(false);
      setPayAmount("");
      setPayNotes("");
      const refreshed = await api.invoices.get(detail.id);
      setDetail(refreshed);
      setInvoices(prev => prev.map(i => i.id === refreshed.id ? { ...i, ...refreshed } : i));
      toast("Payment recorded successfully!", "success", "Payment Saved");
    } catch (err: any) {
      toast(err.message || "Failed to record payment", "error", "Payment Failed");
    } finally {
      setPayLoading(false);
    }
  };

  const handleVoid = (id: number) => {
    setPendingConfirm({
      message: "Void this invoice? This action cannot be undone.",
      action: async () => {
        try {
          await api.invoices.void(id);
          loadInvoices();
          if (detail?.id === id) setDetail({ ...detail, status: "voided" });
          toast("Invoice voided successfully.", "success", "Voided");
        } catch (err: any) {
          toast(err.message || "Failed to void invoice", "error", "Error");
        }
      },
    });
  };


  const buildInvoiceBody = (inv: any) => {
    const d = inv;
    const co = companyData || {};
    const items: any[] = d.items || [];
    const payments: any[] = d.payments || [];
    const balance = d.total_amount - d.paid_amount;

    const itemRows = items.length > 0
      ? items.map((it: any) => `
          <tr>
            <td>${it.product_name}</td>
            <td class="num">${it.quantity}</td>
            <td class="num">${fmt(it.unit_price, sym)}</td>
            <td class="num">${it.discount_amount > 0 ? fmt(it.discount_amount, sym) : '-'}</td>
            <td class="num">${fmt(it.total_price, sym)}</td>
          </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;color:#888;">No item details</td></tr>`;

    const payRows = payments.map((p: any) => `
      <tr>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>${p.payment_method}</td>
        <td class="num">${fmt(p.amount, sym)}</td>
        <td>${p.notes || '-'}</td>
      </tr>`).join('');

    return `
  <div class="header">
    <div class="header-left">
      ${co.logo ? `<img class="logo" src="${co.logo}" alt="${co.name || ''}">` : `<div class="logo-placeholder">No<br>Logo</div>`}
      <div>
        <div class="company-name">${co.name || 'Company Name'}</div>
        <div class="company-detail">
          ${co.address ? `${co.address}<br>` : ''}
          ${co.city ? `${co.city}${co.country ? ', ' + co.country : ''}<br>` : ''}
          ${co.phone ? `Tel: ${co.phone}<br>` : ''}
          ${co.email ? `Email: ${co.email}<br>` : ''}
          ${co.website ? `Web: ${co.website}<br>` : ''}
          ${co.tax_id ? `Tax ID: ${co.tax_id}` : ''}
        </div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">INVOICE</div>
      <div class="doc-number">${d.invoice_number}</div>
      <div class="doc-date">Date: ${new Date(d.created_at).toLocaleDateString()}</div>
      ${d.due_date ? `<div class="doc-date">Due: ${new Date(d.due_date).toLocaleDateString()}</div>` : ''}
      <span class="status-badge status-${d.status}">${d.status.toUpperCase()}</span>
    </div>
  </div>
  <div class="info-box">
    <div class="info-label">Bill To</div>
    <div class="info-name">${d.customer_name}</div>
    ${d.customer_phone ? `<div class="info-detail">Phone: ${d.customer_phone}</div>` : ''}
    ${d.customer_email ? `<div class="info-detail">Email: ${d.customer_email}</div>` : ''}
  </div>
  <div class="section-title">Items</div>
  <table>
    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr><td colspan="4" class="num">Subtotal</td><td class="num">${fmt(d.subtotal, sym)}</td></tr>
      ${d.discount_amount > 0 ? `<tr><td colspan="4" class="num">Discount</td><td class="num">-${fmt(d.discount_amount, sym)}</td></tr>` : ''}
      ${d.tax_amount > 0 ? `<tr><td colspan="4" class="num">Tax</td><td class="num">${fmt(d.tax_amount, sym)}</td></tr>` : ''}
    </tfoot>
  </table>
  <div class="summary">
    <table class="summary-table">
      <tr class="total-row"><td>TOTAL</td><td class="num">${fmt(d.total_amount, sym)}</td></tr>
      <tr class="paid-row"><td>Paid</td><td class="num">${fmt(d.paid_amount, sym)}</td></tr>
      <tr class="balance-row"><td>Balance Due</td><td class="num">${fmt(balance, sym)}</td></tr>
    </table>
  </div>
  ${payments.length > 0 ? `<div class="section-title">Payment History</div><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Notes</th></tr></thead><tbody>${payRows}</tbody></table>` : ''}
  ${d.notes ? `<div class="notes-box"><strong>Notes:</strong> ${d.notes}</div>` : ''}
  <div class="footer">Generated on ${new Date().toLocaleString()} &nbsp;|&nbsp; This is a computer-generated document. No signature is required.</div>`;
  };

  const handlePrintInvoice = (inv: any) => {
    printDocument(`Invoice ${inv.invoice_number}`, buildInvoiceBody(inv));
  };

  const handleDownloadInvoice = (inv: any) => {
    downloadDocument(`Invoice_${inv.invoice_number}`, buildInvoiceBody(inv));
  };

  const filtered = invoices.filter(i =>
    !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    i.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: invoices.length,
    unpaid: invoices.filter(i => i.status === "unpaid").length,
    partial: invoices.filter(i => i.status === "partial").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
  };

  return (
    <AdminLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Left panel */}
        <div className={`flex flex-col flex-1 min-w-0 ${selected ? 'border-r border-admin-border' : ''}`}>
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-admin-border bg-admin-bg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-admin-text">Invoices</h1>
                <p className="text-sm text-admin-text-secondary mt-0.5">Credit sales &amp; payment tracking</p>
              </div>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-admin-text text-admin-bg text-sm font-medium hover:opacity-90"
              >
                <Plus size={15} /> New Invoice
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Total", value: stats.total, color: "text-admin-text" },
                { label: "Unpaid", value: stats.unpaid, color: "text-red-400" },
                { label: "Partial", value: stats.partial, color: "text-yellow-400" },
                { label: "Overdue", value: stats.overdue, color: "text-orange-400" },
              ].map(s => (
                <div key={s.label} className="bg-admin-surface border border-admin-border px-3 py-2">
                  <p className="text-xs text-admin-text-secondary">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" />
                <input
                  type="text"
                  placeholder="Search invoice # or customer..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadInvoices()}
                  className="w-full pl-8 pr-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
              >
                <option value="all">All Status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="voided">Voided</option>
              </select>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm" />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-admin-text-secondary text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-admin-text-secondary">
                <FileText size={40} className="opacity-30 mb-3" />
                <p className="text-sm">No invoices found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-admin-surface border-b border-admin-border sticky top-0">
                  <tr>
                    {["Invoice #", "Customer", "Date", "Due Date", "Total", "Paid", "Balance", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-admin-text-secondary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const balance = inv.total_amount - inv.paid_amount;
                    const isSelected = selected?.id === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        onClick={() => openDetail(inv)}
                        className={`border-b border-admin-border cursor-pointer transition-colors ${
                          isSelected ? 'bg-admin-surface' : 'hover:bg-admin-surface/50'
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-admin-text font-medium">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-admin-text">
                          <div>{inv.customer_name}</div>
                          {inv.customer_phone && <div className="text-xs text-admin-text-secondary">{inv.customer_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-admin-text-secondary">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-admin-text-secondary">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : <span className="text-admin-text-secondary/40">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-admin-text text-right">{fmt(inv.total_amount, sym)}</td>
                        <td className="px-4 py-3 font-mono text-green-400 text-right">{fmt(inv.paid_amount, sym)}</td>
                        <td className={`px-4 py-3 font-mono text-right font-medium ${balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(balance, sym)}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-admin-text-secondary">
                          <ChevronRight size={14} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-[480px] shrink-0 flex flex-col bg-admin-bg overflow-y-auto">
            {/* Panel header */}
            <div className="p-4 border-b border-admin-border flex items-center justify-between bg-admin-surface sticky top-0">
              <div>
                <h2 className="text-base font-bold text-admin-text">{selected.invoice_number}</h2>
                <p className="text-xs text-admin-text-secondary">{selected.customer_name}</p>
              </div>
              <div className="flex items-center gap-2">
                {detail && (
                  <>
                    <button
                      onClick={() => handlePrintInvoice(detail)}
                      title="Print"
                      className="p-2 text-admin-text-secondary hover:text-admin-text border border-admin-border hover:bg-admin-surface"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={() => handleDownloadInvoice(detail)}
                      title="Download PDF"
                      className="p-2 text-admin-text-secondary hover:text-admin-text border border-admin-border hover:bg-admin-surface"
                    >
                      <Download size={15} />
                    </button>
                    {detail.status !== 'voided' && detail.status !== 'paid' && (
                      <button
                        onClick={() => {
                          const balance = detail.total_amount - detail.paid_amount;
                          setPayAmount(String(balance));
                          setShowPayment(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm hover:bg-green-700"
                      >
                        <DollarSign size={14} /> Record Payment
                      </button>
                    )}
                    {detail.status !== 'voided' && detail.status !== 'paid' && (
                      <button
                        onClick={() => handleVoid(detail.id)}
                        className="px-3 py-1.5 text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >Void</button>
                    )}
                  </>
                )}
                <button onClick={() => { setSelected(null); setDetail(null); }} className="p-1 text-admin-text-secondary hover:text-admin-text">
                  <X size={16} />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="flex items-center justify-center py-16 text-admin-text-secondary text-sm">Loading…</div>
            ) : detail ? (
              <div className="p-4 space-y-5">
                {/* Invoice info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-admin-surface border border-admin-border p-3">
                    <p className="text-xs text-admin-text-secondary mb-1">Status</p>
                    <StatusBadge status={detail.status} />
                  </div>
                  <div className="bg-admin-surface border border-admin-border p-3">
                    <p className="text-xs text-admin-text-secondary mb-1">Date</p>
                    <p className="text-sm text-admin-text">{new Date(detail.created_at).toLocaleDateString()}</p>
                  </div>
                  {detail.due_date && (
                    <div className="bg-admin-surface border border-admin-border p-3">
                      <p className="text-xs text-admin-text-secondary mb-1">Due Date</p>
                      <p className="text-sm text-admin-text">{new Date(detail.due_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {detail.customer_phone && (
                    <div className="bg-admin-surface border border-admin-border p-3">
                      <p className="text-xs text-admin-text-secondary mb-1">Phone</p>
                      <p className="text-sm text-admin-text">{detail.customer_phone}</p>
                    </div>
                  )}
                  {detail.customer_email && (
                    <div className="col-span-2 bg-admin-surface border border-admin-border p-3">
                      <p className="text-xs text-admin-text-secondary mb-1">Email</p>
                      <p className="text-sm text-admin-text">{detail.customer_email}</p>
                    </div>
                  )}
                </div>

                {/* Totals summary */}
                <div className="bg-admin-surface border border-admin-border p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-text-secondary">Subtotal</span>
                    <span className="text-admin-text font-mono">{fmt(detail.subtotal, sym)}</span>
                  </div>
                  {detail.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-admin-text-secondary">Discount</span>
                      <span className="text-red-400 font-mono">-{fmt(detail.discount_amount, sym)}</span>
                    </div>
                  )}
                  {detail.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-admin-text-secondary">Tax</span>
                      <span className="text-admin-text font-mono">{fmt(detail.tax_amount, sym)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-admin-border pt-2">
                    <span className="text-admin-text">Total</span>
                    <span className="text-admin-text font-mono">{fmt(detail.total_amount, sym)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Paid</span>
                    <span className="text-green-400 font-mono">{fmt(detail.paid_amount, sym)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className={detail.total_amount - detail.paid_amount > 0 ? "text-red-400" : "text-green-400"}>Balance Due</span>
                    <span className={`font-mono ${detail.total_amount - detail.paid_amount > 0 ? "text-red-400" : "text-green-400"}`}>
                      {fmt(detail.total_amount - detail.paid_amount, sym)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {detail.items?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider mb-2">Items</h3>
                    <div className="border border-admin-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-admin-surface">
                          <tr>
                            <th className="px-3 py-2 text-left text-admin-text-secondary">Product</th>
                            <th className="px-3 py-2 text-right text-admin-text-secondary">Qty</th>
                            <th className="px-3 py-2 text-right text-admin-text-secondary">Price</th>
                            <th className="px-3 py-2 text-right text-admin-text-secondary">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((it: any) => (
                            <tr key={it.id} className="border-t border-admin-border">
                              <td className="px-3 py-2 text-admin-text">{it.product_name}</td>
                              <td className="px-3 py-2 text-right text-admin-text-secondary">{it.quantity}</td>
                              <td className="px-3 py-2 text-right font-mono text-admin-text-secondary">{fmt(it.unit_price, sym)}</td>
                              <td className="px-3 py-2 text-right font-mono text-admin-text">{fmt(it.total_price, sym)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Payment history */}
                <div>
                  <h3 className="text-xs font-semibold text-admin-text-secondary uppercase tracking-wider mb-2">Payment History</h3>
                  {detail.payments?.length === 0 ? (
                    <p className="text-xs text-admin-text-secondary italic">No payments recorded yet</p>
                  ) : (
                    <div className="border border-admin-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-admin-surface">
                          <tr>
                            <th className="px-3 py-2 text-left text-admin-text-secondary">Date</th>
                            <th className="px-3 py-2 text-left text-admin-text-secondary">Method</th>
                            <th className="px-3 py-2 text-right text-admin-text-secondary">Amount</th>
                            <th className="px-3 py-2 text-left text-admin-text-secondary">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payments?.map((p: any) => (
                            <tr key={p.id} className="border-t border-admin-border">
                              <td className="px-3 py-2 text-admin-text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-admin-text">{p.payment_method}</td>
                              <td className="px-3 py-2 text-right font-mono text-green-400">{fmt(p.amount, sym)}</td>
                              <td className="px-3 py-2 text-admin-text-secondary">{p.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {detail.notes && (
                  <div className="bg-admin-surface border border-admin-border p-3">
                    <p className="text-xs text-admin-text-secondary mb-1">Notes</p>
                    <p className="text-sm text-admin-text">{detail.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPayment && detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-admin-surface border border-admin-border p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-admin-text">Record Payment</h3>
              <button onClick={() => setShowPayment(false)}><X size={16} className="text-admin-text-secondary" /></button>
            </div>
            <p className="text-sm text-admin-text-secondary mb-4">
              Invoice {detail.invoice_number} — Balance: <span className="text-red-400 font-mono font-bold">{fmt(detail.total_amount - detail.paid_amount, sym)}</span>
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Amount ({sym.split(' ')[0]})</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                >
                  {["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Card"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-admin-text-secondary mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                  placeholder="Reference number, etc."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPayment(false)} className="flex-1 px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface text-sm">
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={payLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
              >
                {payLoading ? "Saving…" : "Record Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadInvoices(); }}
        />
      )}
      <ConfirmDialog
        open={!!pendingConfirm}
        title="Void Invoice"
        message={pendingConfirm?.message || ""}
        confirmLabel="Void"
        variant="warning"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
