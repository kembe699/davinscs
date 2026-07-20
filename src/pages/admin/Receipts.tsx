import { useState, useEffect } from "react";
import { Search, Receipt as ReceiptIcon, Printer, X } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { printThermal } from "@/utils/printUtils";
import { buildThermalReceipt } from "@/utils/receiptUtils";

export default function Receipts() {
  const { baseCurrency } = useCurrency();
  const sym = baseCurrency?.symbol || "UGX";

  const [sales, setSales] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [secondaryCurrency, setSecondaryCurrency] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadSales();
    loadCompanyData();
    loadSecondaryCurrency();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const [salesData, paymentTypesData] = await Promise.all([
        api.pos.getSales(),
        api.paymentTypes.active(),
      ]);
      setSales(salesData);
      setPaymentTypes(paymentTypesData);
    } catch (err) {
      console.error("Failed to load receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanyData = async () => {
    try {
      setCompanyData(await api.company.get());
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  const loadSecondaryCurrency = async () => {
    try {
      const currencies = await api.currencies.list();
      const base = currencies.find((c: any) => c.is_base);
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

  const getPaymentTypeName = (paymentTypeId: number) =>
    paymentTypes.find(p => p.id === paymentTypeId)?.name || "Unknown";

  const openDetail = async (sale: any) => {
    setSelected(sale);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const full = await api.pos.getSale(sale.id);
      setDetail(full);
    } catch (err) {
      console.error("Failed to load receipt details:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    if (!detail) return;
    const items = (detail.items || []).map((item: any) => ({
      name: item.product_name || "",
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.subtotal ?? item.unit_price * item.quantity,
    }));
    const sale = {
      ...detail,
      customerName: detail.customer_name,
      subtotal: detail.subtotal,
      tax_amount: detail.tax_amount,
      taxAmount: detail.tax_amount,
      taxRate: 0,
      discountAmount: detail.discount_amount ?? 0,
      total: detail.total_amount,
      paymentTypeName: getPaymentTypeName(detail.payment_type_id),
    };
    const html = buildThermalReceipt({
      sale,
      items,
      companyData,
      baseCurrencySymbol: baseCurrency?.symbol || "UGX",
      baseCurrencyCode: baseCurrency?.code || "UGX",
      secondaryCurrency: secondaryCurrency
        ? { id: secondaryCurrency.id, code: secondaryCurrency.code, symbol: secondaryCurrency.symbol }
        : null,
      exchangeRate,
    });
    printThermal(`Receipt_${detail.sale_number}`, html);
  };

  const filtered = sales.filter(sale => {
    const saleDate = new Date(sale.created_at).toISOString().slice(0, 10);
    if (startDate && saleDate < startDate) return false;
    if (endDate && saleDate > endDate) return false;
    if (search) {
      const q = search.toLowerCase();
      const matches =
        sale.sale_number?.toLowerCase().includes(q) ||
        (sale.customer_name || "").toLowerCase().includes(q) ||
        (sale.user_name || sale.user_email || "").toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="flex h-screen overflow-hidden">
        {/* Left panel */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-admin-border">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-admin-border bg-admin-bg">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-admin-text">Receipts</h1>
              <p className="text-sm text-admin-text-secondary mt-0.5">All receipts issued from POS sales</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-secondary" />
                <input
                  type="text"
                  placeholder="Search sale #, customer, cashier…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-admin-bg border border-admin-border text-admin-text text-sm"
                />
              </div>
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
                <ReceiptIcon size={40} className="opacity-30 mb-3" />
                <p className="text-sm">No receipts found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-admin-surface border-b border-admin-border sticky top-0">
                  <tr>
                    {["Sale #", "Customer", "Cashier", "Date", "Payment", "Total", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-admin-text-secondary uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(sale => {
                    const isSelected = selected?.id === sale.id;
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => openDetail(sale)}
                        className={`border-b border-admin-border cursor-pointer transition-colors ${
                          isSelected ? "bg-admin-surface" : "hover:bg-admin-surface/50"
                        } ${sale.voided ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-admin-text font-medium">{sale.sale_number}</td>
                        <td className="px-4 py-3 text-admin-text">{sale.customer_name || "Walk-in"}</td>
                        <td className="px-4 py-3 text-admin-text">{sale.user_name || sale.user_email || "—"}</td>
                        <td className="px-4 py-3 text-admin-text-secondary text-xs">{new Date(sale.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-admin-text">{getPaymentTypeName(sale.payment_type_id)}</td>
                        <td className="px-4 py-3 font-mono text-admin-text text-right">{formatCurrencySync(sale.total_amount, sym, false)}</td>
                        <td className="px-4 py-3">
                          {sale.voided && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/30">Voided</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right panel — receipt detail (always visible; empty until a receipt is selected) */}
        <div className="w-[480px] shrink-0 flex flex-col bg-admin-bg overflow-y-auto">
          <div className="p-4 border-b border-admin-border flex items-center justify-between bg-admin-surface sticky top-0">
            <div>
              <h2 className="text-base font-bold text-admin-text">{selected ? selected.sale_number : "Receipt Details"}</h2>
              <p className="text-xs text-admin-text-secondary">
                {selected ? (selected.customer_name || "Walk-in") : "Select a receipt to view"}
              </p>
            </div>
            {selected && (
              <div className="flex items-center gap-2">
                {detail && (
                  <button
                    onClick={handlePrint}
                    title="Print Receipt"
                    className="p-2 text-admin-text-secondary hover:text-admin-text border border-admin-border hover:bg-admin-surface"
                  >
                    <Printer size={15} />
                  </button>
                )}
                <button onClick={() => { setSelected(null); setDetail(null); }} className="p-1 text-admin-text-secondary hover:text-admin-text">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center text-admin-text-secondary">
              <ReceiptIcon size={40} className="opacity-30 mb-3" />
              <p className="text-sm">Select a receipt from the list to view its details</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-16 text-admin-text-secondary text-sm">Loading…</div>
          ) : detail ? (
            <div className="p-4 space-y-5">
              {/* Sale info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-admin-surface border border-admin-border p-3">
                  <p className="text-xs text-admin-text-secondary mb-1">Date</p>
                  <p className="text-sm text-admin-text">{new Date(detail.created_at).toLocaleString()}</p>
                </div>
                <div className="bg-admin-surface border border-admin-border p-3">
                  <p className="text-xs text-admin-text-secondary mb-1">Payment</p>
                  <p className="text-sm text-admin-text">{getPaymentTypeName(detail.payment_type_id)}</p>
                </div>
                <div className="col-span-2 bg-admin-surface border border-admin-border p-3">
                  <p className="text-xs text-admin-text-secondary mb-1">Cashier</p>
                  <p className="text-sm text-admin-text">{detail.user_name || detail.user_email || "—"}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-admin-text uppercase tracking-wide mb-2">Items</p>
                <div className="border border-admin-border divide-y divide-admin-border">
                  {(detail.items || []).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-admin-text truncate">{item.product_name}</p>
                        <p className="text-xs text-admin-text-secondary">
                          {item.quantity} × {formatCurrencySync(item.unit_price, sym, false)}
                        </p>
                      </div>
                      <span className="font-mono text-admin-text shrink-0">{formatCurrencySync(item.subtotal, sym, false)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-admin-surface border border-admin-border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Subtotal</span>
                  <span className="text-admin-text font-mono">{formatCurrencySync(detail.subtotal, sym, false)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-admin-text-secondary">Tax</span>
                  <span className="text-admin-text font-mono">{formatCurrencySync(detail.tax_amount, sym, false)}</span>
                </div>
                {detail.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-text-secondary">Discount</span>
                    <span className="text-admin-text font-mono">-{formatCurrencySync(detail.discount_amount, sym, false)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-admin-border pt-2 mt-1">
                  <span className="text-admin-text">Total</span>
                  <span className="text-admin-text font-mono">{formatCurrencySync(detail.total_amount, sym, false)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminLayout>
  );
}
