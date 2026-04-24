import { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, Printer, Trash2, RotateCcw, CheckCircle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { useTenantPath } from "@/contexts/TenantContext";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { printThermal } from "@/utils/printUtils";
import { buildThermalReceipt } from "@/utils/receiptUtils";

export default function SalesHistory() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { baseCurrency } = useCurrency();
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyData, setCompanyData] = useState<any>(null);
  const [secondaryCurrency, setSecondaryCurrency] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Refund modal state
  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const [showRefundModal, setShowRefundModal]   = useState(false);
  const [refundItems, setRefundItems]           = useState<Record<number, { checked: boolean; qty: number }>>({});
  const [refundMethod, setRefundMethod]         = useState("cash");
  const [refundReason, setRefundReason]         = useState("");
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [refundResult, setRefundResult]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadData();
    loadCompanyData();
    loadSecondaryCurrency();
  }, []);

  // Re-sync refund item state whenever saleItems reloads (e.g. after a refund)
  useEffect(() => {
    if (!showRefundModal || !saleItems.length) return;
    setRefundItems(prev => {
      const next: Record<number, { checked: boolean; qty: number }> = {};
      saleItems.forEach(item => {
        if (item.quantity <= 0) return; // fully returned — exclude
        const existing = prev[item.product_id];
        next[item.product_id] = {
          checked: existing?.checked ?? false,
          qty: Math.min(existing?.qty ?? item.quantity, item.quantity),
        };
      });
      return next;
    });
  }, [saleItems]);

  const loadCompanyData = async () => {
    try {
      const data = await api.company.get();
      setCompanyData(data);
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  const loadSecondaryCurrency = async () => {
    try {
      const currencies = await api.currencies.list();
      const base      = currencies.find((c: any) => c.is_base);
      const secondary = currencies.find((c: any) => !c.is_base && c.is_active);
      if (!secondary || !base) return;
      setSecondaryCurrency(secondary);
      let resolvedRate: number | null = null;
      try {
        const r = await api.exchangeRates.getActive(base.id, secondary.id);
        if (r) resolvedRate = parseFloat(r.rate.toString());
      } catch { /* try reverse */ }
      if (!resolvedRate) {
        try {
          const r = await api.exchangeRates.getActive(secondary.id, base.id);
          if (r) resolvedRate = 1 / parseFloat(r.rate.toString());
        } catch { /* no rate available */ }
      }
      if (resolvedRate && resolvedRate > 0) setExchangeRate(resolvedRate);
    } catch (err) {
      console.error("Failed to load secondary currency:", err);
    }
  };

  const loadData = async () => {
    try {
      const [salesData, paymentTypesData] = await Promise.all([
        api.pos.getSales(),
        api.paymentTypes.active(),
      ]);
      setSales(salesData);
      setPaymentTypes(paymentTypesData);
    } catch (err) {
      console.error("Failed to load sales:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSaleDetails = async (saleId: number) => {
    try {
      const sale = await api.pos.getSale(saleId);
      setSelectedSale(sale);
      setSaleItems(sale.items || []);
    } catch (err) {
      console.error("Failed to load sale details:", err);
    }
  };

  const getPaymentTypeName = (paymentTypeId: number) => {
    const pt = paymentTypes.find(p => p.id === paymentTypeId);
    return pt?.name || 'Unknown';
  };

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const handlePrint = () => {
    if (!selectedSale) { toast("Please select a sale to print", "warning", "Nothing Selected"); return; }
    const items = (saleItems || []).map((item: any) => ({
      name:       item.product_name || '',
      quantity:   item.quantity,
      unit_price: item.unit_price,
      total:      item.subtotal ?? item.unit_price * item.quantity,
    }));
    const sale = {
      ...selectedSale,
      customerName:    selectedSale.customer_name,
      subtotal:        selectedSale.subtotal,
      tax_amount:      selectedSale.tax_amount,
      taxAmount:       selectedSale.tax_amount,
      taxRate:         0,
      discountAmount:  selectedSale.discount_amount ?? 0,
      total:           selectedSale.total_amount,
      paymentTypeName: getPaymentTypeName(selectedSale.payment_type_id),
    };
    const html = buildThermalReceipt({
      sale,
      items,
      companyData,
      baseCurrencySymbol: baseCurrency?.symbol || 'UGX',
      baseCurrencyCode:   baseCurrency?.code   || 'UGX',
      secondaryCurrency:  secondaryCurrency ? { id: secondaryCurrency.id, code: secondaryCurrency.code, symbol: secondaryCurrency.symbol } : null,
      exchangeRate,
    });
    printThermal(`Receipt_${selectedSale.sale_number}`, html);
  };

  const openRefundModal = () => {
    if (!selectedSale) return;
    if (selectedSale.sale_type === 'refund') { toast("This record is already a refund.", "info", "Info"); return; }
    if (selectedSale.voided)                 { toast("This sale has been voided.", "info", "Info"); return; }
    // Initialise each item as unchecked, qty = original quantity
    const init: Record<number, { checked: boolean; qty: number }> = {};
    saleItems.forEach(item => {
      init[item.product_id] = { checked: false, qty: item.quantity };
    });
    setRefundItems(init);
    setRefundMethod("cash");
    setRefundReason("");
    setRefundResult(null);
    setShowRefundModal(true);
  };

  const calcRefundTotal = () => {
    if (!saleItems.length) return 0;
    return saleItems.reduce((sum, item) => {
      const ri = refundItems[item.product_id];
      if (!ri?.checked) return sum;
      const ratio = ri.qty / item.quantity;
      return sum + Math.round(item.subtotal * ratio);
    }, 0);
  };

  const submitRefund = async () => {
    const selected = saleItems
      .filter(item => refundItems[item.product_id]?.checked)
      .map(item => ({ product_id: item.product_id, quantity: refundItems[item.product_id].qty }));
    if (selected.length === 0) { toast("Select at least one item to refund.", "warning", "Required"); return; }
    setRefundProcessing(true);
    try {
      const res = await api.pos.refundSale(selectedSale.id, selected, refundMethod, refundReason);
      setRefundResult({ ok: true, text: `Refund ${res.refund_number} processed — ${formatCurrencySync(res.refund_amount, baseCurrency?.symbol || 'UGX', false)} refunded via ${refundMethod}.` });
      loadData();
      await loadSaleDetails(selectedSale.id);
    } catch (err: any) {
      setRefundResult({ ok: false, text: err.message || "Refund failed." });
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleDelete = () => {
    if (!selectedSale) {
      toast("Please select a sale to delete", "warning", "Nothing Selected");
      return;
    }
    setPendingConfirm({
      message: `Delete sale ${selectedSale.sale_number}? This action cannot be undone.`,
      action: async () => {
        try {
          await api.pos.voidSale(selectedSale.id);
          toast("Sale deleted successfully", "success", "Deleted");
          loadData();
          setSelectedSale(null);
        } catch (err: any) {
          toast(err.message || "Failed to delete sale", "error", "Error");
        }
      },
    });
  };

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.created_at).toISOString().slice(0, 10);
    if (startDate && saleDate < startDate) return false;
    if (endDate && saleDate > endDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNum = sale.sale_number?.toLowerCase().includes(q);
      const matchesCust = (sale.customer_name || "").toLowerCase().includes(q);
      const matchesUser = (sale.user_email || "").toLowerCase().includes(q);
      if (!matchesNum && !matchesCust && !matchesUser) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-admin-bg">
      {/* Header */}
      <div className="bg-admin-surface border-b border-admin-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(tp("/pos"))}
              className="px-4 py-2 bg-admin-bg border border-admin-border text-admin-text hover:bg-admin-surface flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to POS
            </button>
            <h1 className="text-xl font-bold text-admin-text">Sales history</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-admin-text-secondary text-sm">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
          />
          <span className="text-admin-text-secondary text-sm">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
          />
          <input
            type="text"
            placeholder="Search sale #, customer, cashier…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm w-56 placeholder:text-admin-text-secondary"
          />
          <button
            onClick={handleRefresh}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedSale}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2 disabled:opacity-50"
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={openRefundModal}
            disabled={!selectedSale}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw size={14} /> Refund / Return
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedSale}
            className="px-3 py-2 bg-admin-bg border border-admin-border text-admin-danger text-sm hover:bg-admin-surface flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="p-4">
        <div className="bg-admin-surface border border-admin-border mb-4">
          <div className="bg-admin-bg px-4 py-2 border-b border-admin-border">
            <h3 className="text-sm font-medium text-admin-text">Documents</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-admin-text-secondary">Loading...</div>
          ) : filteredSales.length === 0 ? (
            <div className="p-8 text-center text-admin-text-secondary">No sales found</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[380px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">#</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Sale #</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Cashier</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Customer</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Date &amp; Time</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Payment</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, index) => (
                    <tr
                      key={sale.id}
                      onClick={() => loadSaleDetails(sale.id)}
                      className={`border-b border-admin-border cursor-pointer hover:bg-admin-bg ${
                        selectedSale?.id === sale.id ? 'bg-admin-bg' : ''
                      } ${sale.voided ? 'opacity-50 line-through' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs text-admin-text">{index + 1}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium ${
                          sale.voided ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>{sale.voided ? 'Refund' : 'Sale'}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-admin-text font-mono">{sale.sale_number}</td>
                      <td className="px-3 py-2 text-xs text-admin-text">{sale.user_email || '—'}</td>
                      <td className="px-3 py-2 text-xs text-admin-text">{sale.customer_name || 'Walk-in'}</td>
                      <td className="px-3 py-2 text-xs text-admin-text">{new Date(sale.created_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-admin-text">{getPaymentTypeName(sale.payment_type_id)}</td>
                      <td className="px-3 py-2 text-xs text-right text-admin-text">
                        {sale.discount_amount > 0
                          ? formatCurrencySync(sale.discount_amount, baseCurrency?.symbol || 'UGX', false)
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-mono text-admin-text">
                        {formatCurrencySync(sale.total_amount, baseCurrency?.symbol || 'UGX', false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Document Items Table */}
        <div className="bg-admin-surface border border-admin-border">
          <div className="bg-admin-bg px-4 py-2 border-b border-admin-border">
            <h3 className="text-sm font-medium text-admin-text">Document items</h3>
          </div>
          {selectedSale ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-admin-bg border-b border-admin-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">ID</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Code</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Name</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-admin-text">Unit of measure</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Quantity</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Price before tax</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Tax</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Price</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total before discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Discount</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-admin-text">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-admin-border text-admin-text">
                      <td className="px-3 py-2 text-xs">{index + 1}</td>
                      <td className="px-3 py-2 text-xs">{item.product_id}</td>
                      <td className="px-3 py-2 text-xs">{item.product_name}</td>
                      <td className="px-3 py-2 text-xs">pcs</td>
                      <td className="px-3 py-2 text-xs text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-xs text-right">{Number(item.unit_price).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-right">{Number(item.tax_amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-right">{Number(item.unit_price + item.tax_amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-right">{Number(item.subtotal).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-right">{Number(item.discount_amount).toLocaleString()}</td>
                      <td className="px-3 py-2 text-xs text-right font-mono">{Number(item.subtotal - item.discount_amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-admin-text-secondary text-xs">
              Select a sale to view items
            </div>
          )}
        </div>
      </div>

      {/* Refund / Return Modal */}
      {showRefundModal && selectedSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-admin-surface border border-admin-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
              <div>
                <h2 className="text-admin-text font-bold text-base flex items-center gap-2">
                  <RotateCcw size={16} /> Refund / Return
                </h2>
                <p className="text-admin-text-secondary text-xs mt-0.5">
                  Original sale: <span className="font-mono">{selectedSale.sale_number}</span>
                  {selectedSale.customer_name && ` · ${selectedSale.customer_name}`}
                </p>
              </div>
              <button onClick={() => setShowRefundModal(false)} className="text-admin-text-secondary hover:text-admin-text text-xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Result banner */}
              {refundResult && (
                <div className={`px-4 py-3 text-sm border flex items-start gap-3 ${
                  refundResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-red-500/10 border-red-500/40 text-red-400"
                }`}>
                  {refundResult.ok && <CheckCircle size={16} className="mt-0.5 shrink-0" />}
                  <span>{refundResult.text}</span>
                </div>
              )}

              {/* Item selection */}
              <div>
                <p className="text-xs font-semibold text-admin-text uppercase tracking-wide mb-2">Select items to return</p>
                <div className="border border-admin-border divide-y divide-admin-border">
                  {saleItems.map(item => {
                    const ri = refundItems[item.product_id] || { checked: false, qty: item.quantity };
                    return (
                      <div key={item.product_id} className={`flex items-center gap-3 px-3 py-2.5 ${ri.checked ? "bg-admin-bg" : ""}`}>
                        <input
                          type="checkbox"
                          checked={ri.checked}
                          onChange={e => setRefundItems(prev => ({ ...prev, [item.product_id]: { ...ri, checked: e.target.checked } }))}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-admin-text text-xs font-medium truncate">{item.product_name}</p>
                          <p className="text-admin-text-secondary text-[10px]">
                            Sold qty: {item.quantity} · Unit: {formatCurrencySync(item.unit_price, baseCurrency?.symbol || 'UGX', false)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-admin-text-secondary text-xs">Qty:</span>
                          <input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={ri.qty}
                            disabled={!ri.checked}
                            onChange={e => {
                              const v = Math.min(item.quantity, Math.max(1, Number(e.target.value)));
                              setRefundItems(prev => ({ ...prev, [item.product_id]: { ...ri, qty: v } }));
                            }}
                            className="w-14 px-2 py-1 bg-admin-bg border border-admin-border text-admin-text text-xs text-center disabled:opacity-40"
                          />
                        </div>
                        <div className="text-xs font-mono text-admin-text w-24 text-right shrink-0">
                          {ri.checked
                            ? formatCurrencySync(Math.round(item.subtotal * (ri.qty / item.quantity)), baseCurrency?.symbol || 'UGX', false)
                            : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund method */}
              <div>
                <p className="text-xs font-semibold text-admin-text uppercase tracking-wide mb-2">Refund method</p>
                <div className="flex flex-wrap gap-2">
                  {["cash", "original_payment", "store_credit", "bank_transfer"].map(m => (
                    <button
                      key={m}
                      onClick={() => setRefundMethod(m)}
                      className={`px-3 py-1.5 text-xs border ${
                        refundMethod === m
                          ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                          : "bg-admin-bg border-admin-border text-admin-text-secondary hover:text-admin-text"
                      }`}
                    >
                      {m === "cash" ? "Cash" : m === "original_payment" ? "Original Payment" : m === "store_credit" ? "Store Credit" : "Bank Transfer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <p className="text-xs font-semibold text-admin-text uppercase tracking-wide mb-2">Reason for return</p>
                <textarea
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Defective product, wrong item, customer changed mind…"
                  rows={2}
                  className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-xs placeholder:text-admin-text-secondary resize-none"
                />
              </div>

              {/* Total */}
              <div className="flex items-center justify-between border-t border-admin-border pt-4">
                <span className="text-admin-text text-sm font-semibold">Refund Total</span>
                <span className="text-emerald-400 font-mono font-bold text-lg">
                  {formatCurrencySync(calcRefundTotal(), baseCurrency?.symbol || 'UGX', false)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={submitRefund}
                  disabled={refundProcessing || !!refundResult?.ok}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refundProcessing ? "Processing…" : <><RotateCcw size={14} /> Process Refund</>}
                </button>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 py-2.5 bg-admin-bg border border-admin-border text-admin-text text-sm hover:bg-admin-surface"
                >
                  {refundResult?.ok ? "Close" : "Cancel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingConfirm}
        title="Delete Sale"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
