import { useEffect, useState, Fragment } from "react";
import * as XLSX from "xlsx";
import { api, ApiSupplier, ApiPurchaseOrder, ApiProduct, ApiGRN, ApiSupplierBill, ApiSupplierPayment, ApiCurrency } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Plus, Pencil, Trash2, Check, X, Package, FileText, DollarSign, Printer, Mail, Download, ChevronDown, ChevronUp, ShoppingCart, Truck, Wallet, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { companyHeaderHTML, downloadDocument, printDocument } from "@/utils/printUtils";
import { exportToExcel, exportToPDF, CompanyInfo } from "@/utils/reportExports";

type Tab = "suppliers" | "purchase-orders" | "grn" | "bills" | "payments";

export default function ProcurementEnhanced() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("suppliers");
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [pos, setPOs] = useState<ApiPurchaseOrder[]>([]);
  const [grns, setGRNs] = useState<ApiGRN[]>([]);
  const [bills, setBills] = useState<ApiSupplierBill[]>([]);
  const [payments, setPayments] = useState<ApiSupplierPayment[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [currencies, setCurrencies] = useState<ApiCurrency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingReport, setExportingReport] = useState(false);

  const [pendingConfirm, setPendingConfirm] = useState<{ message: string; action: () => void } | null>(null);

  // Supplier form
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "" });
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Payment history row expansion (shows the bill's line items)
  const [expandedPaymentBillId, setExpandedPaymentBillId] = useState<number | null>(null);
  const [billItemsMap, setBillItemsMap] = useState<Record<number, any[]>>({});
  const [loadingBillItemsFor, setLoadingBillItemsFor] = useState<number | null>(null);

  // Company info for report exports
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Your Company Name", address: "", phone: "", email: ""
  });
  
  // PO form
  const [creatingPO, setCreatingPO] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: 0,
    order_date: new Date().toISOString().split('T')[0],
    notes: "",
    currency_id: 0 as number | 0,
    currency_code: "UGX",
    currency_symbol: "UGX",
    items: [] as { product_id?: number; item_name?: string; quantity: number; unit_price: number }[]
  });
  
  // GRN form
  const [creatingGRN, setCreatingGRN] = useState(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<(ApiPurchaseOrder & { items: any[] }) | null>(null);
  const [grnForm, setGRNForm] = useState({
    po_id: 0,
    received_date: new Date().toISOString().split('T')[0],
    notes: "",
    items: [] as { po_item_id: number; received_quantity: number; notes?: string }[]
  });
  
  // Payment form
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    supplier_id: 0,
    bill_id: undefined as number | undefined,
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: "cash",
    reference: "",
    notes: ""
  });

  const loadSuppliers = async () => {
    try {
      const data = await api.procurement.suppliers.list();
      setSuppliers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    }
  };

  const loadPOs = async () => {
    try {
      const data = await api.procurement.purchaseOrders.list();
      setPOs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
    }
  };

  const loadGRNs = async () => {
    try {
      const data = await api.procurement.grn.list();
      setGRNs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GRNs");
    }
  };

  const loadBills = async () => {
    try {
      const data = await api.procurement.bills.list();
      setBills(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    }
  };

  const loadPayments = async () => {
    try {
      const data = await api.procurement.payments.list();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.products.list();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [,, currencyList] = await Promise.all([
        loadSuppliers(), loadPOs(), api.currencies.list().catch(() => [] as ApiCurrency[]),
        loadGRNs(), loadBills(), loadPayments(), loadProducts()
      ]);
      setCurrencies(currencyList as ApiCurrency[]);
      // set default currency to base
      const base = (currencyList as ApiCurrency[]).find(c => c.is_base) || (currencyList as ApiCurrency[])[0];
      if (base) {
        setPoForm(prev => ({ ...prev, currency_id: base.id, currency_code: base.code, currency_symbol: base.symbol }));
      }
      setLoading(false);
    };
    load();

    api.company.get().then((info: any) => {
      if (info) {
        setCompanyInfo({
          name: info.name || "Your Company Name",
          address: info.address || "",
          phone: info.phone || "",
          email: info.email || "",
          website: info.website,
          tax_id: info.tax_id,
          logo: info.logo || "",
        });
      }
    }).catch(() => {});
  }, []);

  // Everything needed is already loaded (pos/grns/bills/payments) — no extra fetch required.
  const getSupplierOverview = (supplierId: number) => {
    const supplierPOs = pos.filter(p => p.supplier_id === supplierId);
    const supplierGRNs = grns.filter(g => g.supplier_id === supplierId);
    const supplierBills = bills.filter(b => b.supplier_id === supplierId);
    const supplierPayments = payments
      .filter(p => p.supplier_id === supplierId)
      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

    const totalOrdered = supplierPOs.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalBilled = supplierBills.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const totalPaid = supplierBills.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);
    const balance = totalBilled - totalPaid;

    return {
      poCount: supplierPOs.length,
      grnCount: supplierGRNs.length,
      billCount: supplierBills.length,
      totalOrdered,
      totalBilled,
      totalPaid,
      balance,
      payments: supplierPayments,
    };
  };

  // Toggle a Payment History row open, fetching (and caching) that bill's line items on first expand
  const togglePaymentRow = async (billId: number | undefined) => {
    if (!billId) return;
    if (expandedPaymentBillId === billId) {
      setExpandedPaymentBillId(null);
      return;
    }
    setExpandedPaymentBillId(billId);
    if (!billItemsMap[billId]) {
      setLoadingBillItemsFor(billId);
      try {
        const bill = await api.procurement.bills.print(billId);
        setBillItemsMap(prev => ({ ...prev, [billId]: (bill as any).items || [] }));
      } catch {
        setBillItemsMap(prev => ({ ...prev, [billId]: [] }));
      } finally {
        setLoadingBillItemsFor(null);
      }
    }
  };

  // Grouped by bill (a supplier can have many POs/bills) — each bill's own
  // totals appear once, with its items listed underneath it, rather than one
  // flat row-per-item table (which also made "TOTAL" nonsensically sum
  // bill-number/reference strings as if they were amounts).
  const buildSupplierReportBills = async (supplierId: number) => {
    const supplierBills = bills.filter(b => b.supplier_id === supplierId);
    const result: { bill: ApiSupplierBill; items: any[]; billTotal: number; paid: number; balance: number }[] = [];
    for (const b of supplierBills) {
      let items = billItemsMap[b.id];
      if (!items) {
        try {
          items = ((await api.procurement.bills.print(b.id)) as any).items || [];
          setBillItemsMap(prev => ({ ...prev, [b.id]: items! }));
        } catch {
          items = [];
        }
      }
      const billTotal = Number(b.total_amount || 0);
      const paid = Number(b.paid_amount || 0);
      result.push({ bill: b, items, billTotal, paid, balance: billTotal - paid });
    }
    return result;
  };

  const handleDownloadSupplierReport = async (supplier: ApiSupplier, format: "excel" | "pdf") => {
    setExportingReport(true);
    try {
      const billGroups = await buildSupplierReportBills(supplier.id);
      if (format === "excel") {
        downloadSupplierReportExcel(supplier, billGroups);
      } else {
        downloadSupplierReportPdf(supplier, billGroups);
      }
    } catch (err: any) {
      toast(err.message || "Failed to build report", "error", "Export Failed");
    } finally {
      setExportingReport(false);
    }
  };

  type SupplierBillGroup = { bill: ApiSupplierBill; items: any[]; billTotal: number; paid: number; balance: number };

  const downloadSupplierReportExcel = (supplier: ApiSupplier, billGroups: SupplierBillGroup[]) => {
    const rows: any[][] = [
      [companyInfo.name],
      [companyInfo.address],
      [`Phone: ${companyInfo.phone} | Email: ${companyInfo.email}`],
      [],
      [`SUPPLIER REPORT - ${supplier.name.toUpperCase()}`],
      [`Generated ${new Date().toLocaleDateString()}`],
      [],
    ];

    let totalBilled = 0, totalPaid = 0;
    if (billGroups.length === 0) {
      rows.push(["No bills recorded for this supplier."]);
    }
    for (const { bill, items, billTotal, paid, balance } of billGroups) {
      totalBilled += billTotal;
      totalPaid += paid;
      rows.push([
        `Bill ${bill.bill_number}`,
        bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : "",
        (bill as any).po_number || (bill as any).grn_number || "",
        bill.status,
      ]);
      rows.push(["Item", "Qty", "Unit Price", "Line Total"]);
      if (items.length === 0) {
        rows.push(["No items recorded for this bill."]);
      } else {
        for (const it of items) {
          const qty = Number(it.received_quantity || 0);
          const price = Number(it.unit_price || 0);
          rows.push([it.product_name || "—", qty, price, qty * price]);
        }
      }
      rows.push(["", "", "Bill Total", billTotal]);
      rows.push(["", "", "Paid", paid]);
      rows.push(["", "", "Balance", balance]);
      rows.push([]);
    }
    rows.push([]);
    rows.push(["", "", "TOTAL BILLED", totalBilled]);
    rows.push(["", "", "TOTAL PAID", totalPaid]);
    rows.push(["", "", "BALANCE OWED", totalBilled - totalPaid]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Report");
    XLSX.writeFile(wb, `Supplier_Report_${supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSupplierReportPdf = (supplier: ApiSupplier, billGroups: SupplierBillGroup[]) => {
    const sym = currencies.find(c => c.is_base)?.symbol ?? "UGX";
    const fmt = (n: number) => `${sym} ${Number(n || 0).toLocaleString()}`;

    let totalBilled = 0, totalPaid = 0;
    const sections = billGroups.map(({ bill, items, billTotal, paid, balance }) => {
      totalBilled += billTotal;
      totalPaid += paid;
      const reference = (bill as any).po_number || (bill as any).grn_number || "";
      const itemRows = items.length
        ? items.map((it: any) => {
            const qty = Number(it.received_quantity || 0);
            const price = Number(it.unit_price || 0);
            return `<tr><td>${it.product_name || "—"}</td><td class="num">${qty}</td><td class="num">${fmt(price)}</td><td class="num">${fmt(qty * price)}</td></tr>`;
          }).join("")
        : `<tr><td colspan="4" class="center" style="color:#888">No items</td></tr>`;
      return `
        <div class="section-title">Bill ${bill.bill_number} — ${bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : ""}${reference ? ` — ${reference}` : ""} — <span class="status-badge status-${bill.status}">${bill.status}</span></div>
        <table>
          <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Line Total</th></tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr><td colspan="3" class="right">Bill Total</td><td class="num">${fmt(billTotal)}</td></tr>
            <tr><td colspan="3" class="right">Paid</td><td class="num">${fmt(paid)}</td></tr>
            <tr><td colspan="3" class="right">Balance</td><td class="num">${fmt(balance)}</td></tr>
          </tfoot>
        </table>`;
    }).join("");

    const body = `
      ${companyHeaderHTML(companyInfo, "SUPPLIER REPORT", supplier.name, `<div class="doc-date">Generated ${new Date().toLocaleDateString()}</div>`)}
      ${sections || `<p class="no-data">No bills recorded for this supplier.</p>`}
      <div class="summary">
        <table class="summary-table">
          <tr><td>Total Billed</td><td class="num">${fmt(totalBilled)}</td></tr>
          <tr class="paid-row"><td>Total Paid</td><td class="num">${fmt(totalPaid)}</td></tr>
          <tr class="balance-row total-row"><td>Balance Owed</td><td class="num">${fmt(totalBilled - totalPaid)}</td></tr>
        </table>
      </div>
      <div class="footer">Generated on ${new Date().toLocaleString()}</div>
    `;
    downloadDocument(`Supplier_Report_${supplier.name}`, body);
  };

  const allSuppliersReportColumns = [
    { header: "Supplier", dataKey: "supplier" },
    { header: "Contact", dataKey: "contact" },
    { header: "Phone", dataKey: "phone" },
    { header: "Orders", dataKey: "orders" },
    { header: "GRNs", dataKey: "grns" },
    { header: "Bills", dataKey: "bills" },
    { header: "Total Ordered", dataKey: "total_ordered" },
    { header: "Total Billed", dataKey: "total_billed" },
    { header: "Total Paid", dataKey: "total_paid" },
    { header: "Balance Owed", dataKey: "balance" },
  ];

  const handleDownloadAllSuppliersReport = (format: "excel" | "pdf") => {
    const sym = currencies.find(c => c.is_base)?.symbol ?? "UGX";
    const data = suppliers.map(s => {
      const ov = getSupplierOverview(s.id);
      return {
        supplier: s.name,
        contact: s.contact_person || "—",
        phone: s.phone || "—",
        orders: ov.poCount,
        grns: ov.grnCount,
        bills: ov.billCount,
        total_ordered: ov.totalOrdered,
        total_billed: ov.totalBilled,
        total_paid: ov.totalPaid,
        balance: ov.balance,
      };
    });
    const opts = {
      reportTitle: "All Suppliers Report",
      dateRange: `Generated ${new Date().toLocaleDateString()}`,
      companyInfo,
      data,
      columns: allSuppliersReportColumns,
      currency: sym,
    };
    if (format === "excel") exportToExcel(opts); else exportToPDF(opts);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return;
    setSaving(true);
    setError("");
    try {
      if (editingSupplierId) {
        await api.procurement.suppliers.update(editingSupplierId, supplierForm);
        toast("Supplier updated successfully.", "success", "Saved");
      } else {
        await api.procurement.suppliers.create(supplierForm);
        toast("Supplier created successfully.", "success", "Saved");
      }
      await loadSuppliers();
      setEditingSupplierId(null);
      setAddingSupplier(false);
      setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast(msg, "error", "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = (id: number) => {
    setPendingConfirm({
      message: "Delete this supplier? This cannot be undone.",
      action: async () => {
        try {
          await api.procurement.suppliers.delete(id);
          await loadSuppliers();
          toast("Supplier deleted.", "success", "Deleted");
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Delete failed";
          setError(msg);
          toast(msg, "error", "Failed");
        }
      },
    });
  };

  const handleCreatePO = async () => {
    if (!poForm.supplier_id || poForm.items.length === 0) {
      setError("Supplier and at least one item required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.procurement.purchaseOrders.create(poForm);
      toast("Purchase Order created successfully.", "success", "Created");
      await loadPOs();
      setCreatingPO(false);
      setPoForm({
        supplier_id: 0,
        order_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: []
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create PO";
      setError(msg);
      toast(msg, "error", "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleBillSelectedForPayment = (billId: number) => {
    if (!billId) {
      setPaymentForm(prev => ({ ...prev, bill_id: undefined, supplier_id: 0, amount: 0 }));
      return;
    }
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      setPaymentForm(prev => ({
        ...prev,
        bill_id: billId,
        supplier_id: bill.supplier_id,
        amount: bill.total_amount - bill.paid_amount,
      }));
    }
  };

  const handleCreateGRN = async () => {
    if (!grnForm.po_id || grnForm.items.length === 0) {
      setError("PO and items required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await api.procurement.grn.create(grnForm);
      await Promise.all([loadGRNs(), loadPOs(), loadBills()]);
      toast(
        created?.bill
          ? `GRN ${created.grn_number} and Bill ${created.bill.bill_number} created successfully.`
          : created?.grn_number
            ? `GRN ${created.grn_number} created successfully.`
            : "GRN created successfully.",
        "success",
        "Received"
      );
      setCreatingGRN(false);
      setSelectedPOForGRN(null);
      setGRNForm({
        po_id: 0,
        received_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: []
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create GRN";
      setError(msg);
      toast(msg, "error", "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!paymentForm.supplier_id || !paymentForm.amount) {
      setError("Supplier and amount required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.procurement.payments.create(paymentForm);
      await Promise.all([loadPayments(), loadBills()]);
      toast("Payment recorded successfully.", "success", "Created");
      setCreatingPayment(false);
      setPaymentForm({
        supplier_id: 0,
        bill_id: undefined,
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: "cash",
        reference: "",
        notes: ""
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create payment";
      setError(msg);
      toast(msg, "error", "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPO = async (id: number) => {
    try {
      const [co, po] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.purchaseOrders.print(id),
      ]);

      const sym = po.currency_symbol || po.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (po.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || it.item_name || ""}</td>
          <td class="num">${Number(it.quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");

      const body = `
        ${companyHeaderHTML(co, "PURCHASE ORDER", po.po_number || String(po.id), `<div class="doc-date">Date: ${po.order_date ? new Date(po.order_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${po.supplier_name || ""}</div>
          ${po.supplier_phone ? `<div class="info-detail">Phone: ${po.supplier_phone}</div>` : ""}
          ${po.supplier_email ? `<div class="info-detail">Email: ${po.supplier_email}</div>` : ""}
          ${po.supplier_address ? `<div class="info-detail">Address: ${po.supplier_address}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="5" class="center" style="color:#888">No items</td></tr>`}</tbody>
          <tfoot>
            <tr><td colspan="4" class="right">Total</td><td class="num">${fmt(Number(po.total_amount || 0))}</td></tr>
          </tfoot>
        </table>
        ${po.notes ? `<div class="notes-box"><strong>Notes:</strong> ${po.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;

      printDocument(`Purchase Order ${po.po_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const handleDownloadPO = async (id: number) => {
    try {
      const [co, po] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.purchaseOrders.print(id),
      ]);

      const sym = po.currency_symbol || po.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (po.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || it.item_name || ""}</td>
          <td class="num">${Number(it.quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");

      const body = `
        ${companyHeaderHTML(co, "PURCHASE ORDER", po.po_number || String(po.id), `<div class="doc-date">Date: ${po.order_date ? new Date(po.order_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${po.supplier_name || ""}</div>
          ${po.supplier_phone ? `<div class="info-detail">Phone: ${po.supplier_phone}</div>` : ""}
          ${po.supplier_email ? `<div class="info-detail">Email: ${po.supplier_email}</div>` : ""}
          ${po.supplier_address ? `<div class="info-detail">Address: ${po.supplier_address}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="5" class="center" style="color:#888">No items</td></tr>`}</tbody>
          <tfoot>
            <tr><td colspan="4" class="right">Total</td><td class="num">${fmt(Number(po.total_amount || 0))}</td></tr>
          </tfoot>
        </table>
        ${po.notes ? `<div class="notes-box"><strong>Notes:</strong> ${po.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;

      downloadDocument(`PurchaseOrder_${po.po_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const handlePrintGRN = async (id: number) => {
    try {
      const [co, grn] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.grn.print(id),
      ]);
      const sym = grn.currency_symbol || grn.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (grn.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || ""}</td>
          <td class="num">${Number(it.ordered_quantity || 0)}</td>
          <td class="num">${Number(it.received_quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.received_quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");
      const body = `
        ${companyHeaderHTML(co, "GOODS RECEIVED NOTE", grn.grn_number || String(grn.id), `<div class="doc-date">Date: ${grn.received_date ? new Date(grn.received_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${grn.supplier_name || ""}</div>
          ${grn.po_number ? `<div class="info-detail">PO: ${grn.po_number}</div>` : ""}
          ${grn.supplier_phone ? `<div class="info-detail">Phone: ${grn.supplier_phone}</div>` : ""}
          ${grn.supplier_email ? `<div class="info-detail">Email: ${grn.supplier_email}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="6" class="center" style="color:#888">No items</td></tr>`}</tbody>
        </table>
        ${grn.notes ? `<div class="notes-box"><strong>Notes:</strong> ${grn.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;
      printDocument(`GRN ${grn.grn_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const handleDownloadGRN = async (id: number) => {
    try {
      const [co, grn] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.grn.print(id),
      ]);
      const sym = grn.currency_symbol || grn.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (grn.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || ""}</td>
          <td class="num">${Number(it.ordered_quantity || 0)}</td>
          <td class="num">${Number(it.received_quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.received_quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");
      const body = `
        ${companyHeaderHTML(co, "GOODS RECEIVED NOTE", grn.grn_number || String(grn.id), `<div class="doc-date">Date: ${grn.received_date ? new Date(grn.received_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${grn.supplier_name || ""}</div>
          ${grn.po_number ? `<div class="info-detail">PO: ${grn.po_number}</div>` : ""}
          ${grn.supplier_phone ? `<div class="info-detail">Phone: ${grn.supplier_phone}</div>` : ""}
          ${grn.supplier_email ? `<div class="info-detail">Email: ${grn.supplier_email}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="6" class="center" style="color:#888">No items</td></tr>`}</tbody>
        </table>
        ${grn.notes ? `<div class="notes-box"><strong>Notes:</strong> ${grn.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;
      downloadDocument(`GRN_${grn.grn_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const handlePrintBill = async (id: number) => {
    try {
      const [co, bill] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.bills.print(id),
      ]);
      const sym = bill.currency_symbol || bill.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (bill.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || ""}</td>
          <td class="num">${Number(it.received_quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.received_quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");
      const body = `
        ${companyHeaderHTML(co, "SUPPLIER BILL", bill.bill_number || String(bill.id), `<div class="doc-date">Date: ${bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${bill.supplier_name || ""}</div>
          ${bill.grn_number ? `<div class="info-detail">GRN: ${bill.grn_number}</div>` : ""}
          ${bill.po_number ? `<div class="info-detail">PO: ${bill.po_number}</div>` : ""}
          ${bill.supplier_phone ? `<div class="info-detail">Phone: ${bill.supplier_phone}</div>` : ""}
          ${bill.supplier_email ? `<div class="info-detail">Email: ${bill.supplier_email}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="5" class="center" style="color:#888">No items</td></tr>`}</tbody>
          <tfoot>
            <tr><td colspan="4" class="right">Total</td><td class="num">${fmt(Number(bill.total_amount || 0))}</td></tr>
            <tr><td colspan="4" class="right">Paid</td><td class="num">${fmt(Number(bill.paid_amount || 0))}</td></tr>
            <tr><td colspan="4" class="right">Balance</td><td class="num">${fmt(Number(bill.balance || 0))}</td></tr>
          </tfoot>
        </table>
        ${bill.notes ? `<div class="notes-box"><strong>Notes:</strong> ${bill.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;
      printDocument(`Bill ${bill.bill_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const handleDownloadBill = async (id: number) => {
    try {
      const [co, bill] = await Promise.all([
        api.company.get().catch(() => ({})),
        api.procurement.bills.print(id),
      ]);
      const sym = bill.currency_symbol || bill.currency_code || (currencies.find(c => c.is_base)?.symbol ?? "UGX");
      const fmt = (n: number) => `${sym}${Number(n || 0).toLocaleString()}`;
      const itemRows = (bill.items || []).map((it: any, i: number) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.product_name || ""}</td>
          <td class="num">${Number(it.received_quantity || 0)}</td>
          <td class="num">${fmt(Number(it.unit_price || 0))}</td>
          <td class="num">${fmt(Number(it.received_quantity || 0) * Number(it.unit_price || 0))}</td>
        </tr>`).join("");
      const body = `
        ${companyHeaderHTML(co, "SUPPLIER BILL", bill.bill_number || String(bill.id), `<div class="doc-date">Date: ${bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : ""}</div>`)}
        <div class="info-box">
          <div class="info-label">Supplier</div>
          <div class="info-name">${bill.supplier_name || ""}</div>
          ${bill.grn_number ? `<div class="info-detail">GRN: ${bill.grn_number}</div>` : ""}
          ${bill.po_number ? `<div class="info-detail">PO: ${bill.po_number}</div>` : ""}
          ${bill.supplier_phone ? `<div class="info-detail">Phone: ${bill.supplier_phone}</div>` : ""}
          ${bill.supplier_email ? `<div class="info-detail">Email: ${bill.supplier_email}</div>` : ""}
        </div>
        <div class="section-title">Items</div>
        <table>
          <thead><tr><th>#</th><th>Item</th><th class="right">Qty</th><th class="right">Unit Price</th><th class="right">Total</th></tr></thead>
          <tbody>${itemRows || `<tr><td colspan="5" class="center" style="color:#888">No items</td></tr>`}</tbody>
          <tfoot>
            <tr><td colspan="4" class="right">Total</td><td class="num">${fmt(Number(bill.total_amount || 0))}</td></tr>
            <tr><td colspan="4" class="right">Paid</td><td class="num">${fmt(Number(bill.paid_amount || 0))}</td></tr>
            <tr><td colspan="4" class="right">Balance</td><td class="num">${fmt(Number(bill.balance || 0))}</td></tr>
          </tfoot>
        </table>
        ${bill.notes ? `<div class="notes-box"><strong>Notes:</strong> ${bill.notes}</div>` : ""}
        <div class="footer">Generated on ${new Date().toLocaleString()}</div>
      `;
      downloadDocument(`Bill_${bill.bill_number || id}`, body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setError(msg);
      toast(msg, "error", "Failed");
    }
  };

  const startGRNFromPO = async (poId: number) => {
    try {
      const po = await api.procurement.purchaseOrders.get(poId);
      setSelectedPOForGRN(po);
      setGRNForm({
        po_id: poId,
        received_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: po.items.map(item => ({
          po_item_id: item.id,
          received_quantity: item.quantity - item.received_quantity,
          notes: ""
        }))
      });
      setCreatingGRN(true);
      setTab("grn");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PO");
    }
  };

  const grnAnyReceiveQty = grnForm.items.some((it) => Number(it.received_quantity || 0) > 0);
  const grnStep = saving ? 3 : selectedPOForGRN ? (grnAnyReceiveQty ? 2 : 1) : 0;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Supply Chain</p>
          <h1 className="text-2xl font-bold text-foreground">Procurement</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-border-subtle">
          {[
            { id: "suppliers", label: "Suppliers" },
            { id: "purchase-orders", label: "Purchase Orders" },
            { id: "grn", label: "GRN" },
            { id: "bills", label: "Bills" },
            { id: "payments", label: "Payments" }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`px-4 py-2 text-xs font-mono-tech uppercase tracking-widest transition-colors ${
                tab === id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Suppliers Tab */}
        {tab === "suppliers" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingSupplierId(null);
                  setAddingSupplier(true);
                  setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
                }}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus size={16} /> New Supplier
              </button>
              <div className="flex-1" />
              <span className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest mr-1">All Suppliers Report</span>
              <button
                onClick={() => handleDownloadAllSuppliersReport("excel")}
                disabled={suppliers.length === 0}
                className="px-3 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-50 flex items-center gap-2"
                title="Download all suppliers report as Excel"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                onClick={() => handleDownloadAllSuppliersReport("pdf")}
                disabled={suppliers.length === 0}
                className="px-3 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-50 flex items-center gap-2"
                title="Download all suppliers report as PDF"
              >
                <FileText size={14} /> PDF
              </button>
            </div>

            {(addingSupplier || editingSupplierId !== null) && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">{editingSupplierId ? "Edit" : "New"} Supplier</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs col-span-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSupplier}
                    disabled={saving || !supplierForm.name}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSupplierId(null);
                      setAddingSupplier(false);
                      setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
                    }}
                    className="px-4 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="w-8"></th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Contact</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Email</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Phone</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {suppliers.map((supplier) => {
                    const isExpanded = expandedSupplierId === supplier.id;
                    const sym = currencies.find(c => c.is_base)?.symbol ?? 'UGX';
                    return (
                    <Fragment key={supplier.id}>
                    <tr
                      onClick={() => setExpandedSupplierId(isExpanded ? null : supplier.id)}
                      className={`cursor-pointer hover:bg-chassis/50 transition-colors ${isExpanded ? 'bg-chassis/40' : ''}`}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{supplier.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.contact_person || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.phone || "—"}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingSupplierId(supplier.id);
                            setAddingSupplier(true);
                            setSupplierForm({
                              name: supplier.name,
                              contact_person: supplier.contact_person || "",
                              email: supplier.email || "",
                              phone: supplier.phone || "",
                              address: supplier.address || ""
                            });
                          }}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="px-2 py-1 text-xs text-red-500 hover:underline ml-2"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (() => {
                      const ov = getSupplierOverview(supplier.id);
                      return (
                        <tr className="bg-background/30">
                          <td colSpan={6} className="p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                              <div className="border border-border-subtle bg-chassis p-3">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><ShoppingCart size={13} /><span className="text-[9px] font-mono-tech uppercase tracking-widest">Orders</span></div>
                                <p className="text-lg font-bold text-foreground">{ov.poCount}</p>
                                <p className="text-[10px] text-muted-foreground font-mono-tech">{sym}{ov.totalOrdered.toLocaleString()}</p>
                              </div>
                              <div className="border border-border-subtle bg-chassis p-3">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Truck size={13} /><span className="text-[9px] font-mono-tech uppercase tracking-widest">Received (GRN)</span></div>
                                <p className="text-lg font-bold text-foreground">{ov.grnCount}</p>
                              </div>
                              <div className="border border-border-subtle bg-chassis p-3">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><FileText size={13} /><span className="text-[9px] font-mono-tech uppercase tracking-widest">Bills</span></div>
                                <p className="text-lg font-bold text-foreground">{ov.billCount}</p>
                                <p className="text-[10px] text-muted-foreground font-mono-tech">{sym}{ov.totalBilled.toLocaleString()}</p>
                              </div>
                              <div className="border border-border-subtle bg-chassis p-3">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><DollarSign size={13} /><span className="text-[9px] font-mono-tech uppercase tracking-widest">Total Paid</span></div>
                                <p className="text-lg font-bold text-green-500">{sym}{ov.totalPaid.toLocaleString()}</p>
                              </div>
                              <div className="border border-border-subtle bg-chassis p-3">
                                <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Wallet size={13} /><span className="text-[9px] font-mono-tech uppercase tracking-widest">Balance Owed</span></div>
                                <p className={`text-lg font-bold ${ov.balance > 0 ? 'text-red-500' : 'text-foreground'}`}>{sym}{ov.balance.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-bold text-foreground">Payment History</h4>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest mr-1">
                                  {exportingReport ? "Building report…" : "Supplier Report"}
                                </span>
                                <button
                                  onClick={() => handleDownloadSupplierReport(supplier, "excel")}
                                  disabled={exportingReport}
                                  className="px-2 py-1 border border-border-subtle text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center gap-1 disabled:opacity-50"
                                  title="Download this supplier's report as Excel"
                                >
                                  <FileSpreadsheet size={12} /> Excel
                                </button>
                                <button
                                  onClick={() => handleDownloadSupplierReport(supplier, "pdf")}
                                  disabled={exportingReport}
                                  className="px-2 py-1 border border-border-subtle text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 flex items-center gap-1 disabled:opacity-50"
                                  title="Download this supplier's report as PDF"
                                >
                                  <FileText size={12} /> PDF
                                </button>
                              </div>
                            </div>
                            {ov.payments.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No payments recorded for this supplier yet.</p>
                            ) : (
                              <div className="border border-border-subtle overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-chassis border-b border-border-subtle">
                                      <th className="w-6"></th>
                                      <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                                      <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">For</th>
                                      <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Method</th>
                                      <th className="text-right px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Amount</th>
                                      <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border-subtle">
                                    {ov.payments.map(p => {
                                      const rowExpanded = !!p.bill_id && expandedPaymentBillId === p.bill_id;
                                      const items = p.bill_id ? billItemsMap[p.bill_id] : undefined;
                                      const isLoadingItems = p.bill_id && loadingBillItemsFor === p.bill_id;
                                      return (
                                        <Fragment key={p.id}>
                                          <tr
                                            onClick={() => togglePaymentRow(p.bill_id)}
                                            className={p.bill_id ? "cursor-pointer hover:bg-chassis/50 transition-colors" : ""}
                                          >
                                            <td className="px-2 py-2 text-muted-foreground">
                                              {p.bill_id ? (rowExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</td>
                                            <td className="px-3 py-2 text-foreground">{p.bill_number || "—"}</td>
                                            <td className="px-3 py-2 text-muted-foreground capitalize">{p.payment_method?.replace('_', ' ')}</td>
                                            <td className="px-3 py-2 text-right font-mono-tech text-foreground">{sym}{Number(p.amount).toLocaleString()}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{p.notes || "—"}</td>
                                          </tr>
                                          {rowExpanded && (
                                            <tr className="bg-background/50">
                                              <td colSpan={6} className="px-4 py-3">
                                                {isLoadingItems ? (
                                                  <p className="text-muted-foreground">Loading items…</p>
                                                ) : !items || items.length === 0 ? (
                                                  <p className="text-muted-foreground">No items recorded for this bill.</p>
                                                ) : (
                                                  <table className="w-full">
                                                    <thead>
                                                      <tr className="text-muted-foreground">
                                                        <th className="text-left py-1 font-mono-tech text-[9px] uppercase tracking-widest">Item</th>
                                                        <th className="text-right py-1 font-mono-tech text-[9px] uppercase tracking-widest">Qty</th>
                                                        <th className="text-right py-1 font-mono-tech text-[9px] uppercase tracking-widest">Unit Price</th>
                                                        <th className="text-right py-1 font-mono-tech text-[9px] uppercase tracking-widest">Total</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border-subtle">
                                                      {items.map((it: any, i: number) => (
                                                        <tr key={i}>
                                                          <td className="py-1 text-foreground">{it.product_name || "—"}</td>
                                                          <td className="py-1 text-right text-muted-foreground">{Number(it.received_quantity || 0)}</td>
                                                          <td className="py-1 text-right font-mono-tech text-muted-foreground">{sym}{Number(it.unit_price || 0).toLocaleString()}</td>
                                                          <td className="py-1 text-right font-mono-tech text-foreground">{sym}{(Number(it.received_quantity || 0) * Number(it.unit_price || 0)).toLocaleString()}</td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                )}
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })()}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Purchase Orders Tab */}
        {tab === "purchase-orders" && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setCreatingPO(!creatingPO)}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus size={16} /> New Purchase Order
              </button>
            </div>

            {creatingPO && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">New Purchase Order</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <select
                    value={poForm.supplier_id}
                    onChange={(e) => setPoForm({ ...poForm, supplier_id: parseInt(e.target.value) })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value={0}>Select Supplier *</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    type="date"
                    value={poForm.order_date}
                    onChange={(e) => setPoForm({ ...poForm, order_date: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <select
                    value={poForm.currency_id}
                    onChange={(e) => {
                      const cur = currencies.find(c => c.id === parseInt(e.target.value));
                      if (cur) setPoForm({ ...poForm, currency_id: cur.id, currency_code: cur.code, currency_symbol: cur.symbol });
                    }}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value={0}>Select Currency *</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name} ({c.symbol})</option>)}
                  </select>
                </div>
                <textarea
                  placeholder="Notes"
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border-subtle text-xs mb-4"
                  rows={2}
                />
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold">Order Items</h4>
                    <button
                      onClick={() => setPoForm({ ...poForm, items: [...poForm.items, { quantity: 1, unit_price: 0 }] })}
                      className="px-3 py-1 border border-border-subtle text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Plus size={10} /> Add Item
                    </button>
                  </div>
                  {poForm.items.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-3 text-center border border-dashed border-border-subtle">
                      No items yet — click "Add Item" to start
                    </p>
                  )}
                  {poForm.items.length > 0 && (
                    <div className="border border-border-subtle overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-chassis border-b border-border-subtle">
                            <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product / Item</th>
                            <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Custom Name</th>
                            <th className="text-center px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Qty</th>
                            <th className="text-right px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Unit Cost ({poForm.currency_code})</th>
                            <th className="text-right px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Subtotal</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {poForm.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">
                                <select
                                  value={item.product_id || ""}
                                  onChange={(e) => {
                                    const pid = e.target.value ? parseInt(e.target.value) : undefined;
                                    const prod = pid ? products.find(p => p.id === pid) : undefined;
                                    const newItems = [...poForm.items];
                                    newItems[idx] = {
                                      ...newItems[idx],
                                      product_id: pid,
                                      item_name: undefined,
                                      unit_price: prod ? Number(prod.cost_price ?? prod.price) : newItems[idx].unit_price,
                                    };
                                    setPoForm({ ...poForm, items: newItems });
                                  }}
                                  className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                                >
                                  <option value="">— select existing product —</option>
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2">
                                {!item.product_id ? (
                                  <input
                                    type="text"
                                    placeholder="Insert item name"
                                    value={item.item_name || ""}
                                    onChange={(e) => {
                                      const newItems = [...poForm.items];
                                      newItems[idx].item_name = e.target.value;
                                      setPoForm({ ...poForm, items: newItems });
                                    }}
                                    className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                                  />
                                ) : (
                                  <span className="text-muted-foreground italic text-[10px]">using product name</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  placeholder="1"
                                  min={1}
                                  value={item.quantity || ""}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[idx].quantity = parseInt(e.target.value) || 0;
                                    setPoForm({ ...poForm, items: newItems });
                                  }}
                                  className="w-16 px-2 py-1 bg-background border border-border-subtle text-xs text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  placeholder="Insert unit price"
                                  min={0}
                                  step="any"
                                  value={item.unit_price || ""}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                                    setPoForm({ ...poForm, items: newItems });
                                  }}
                                  className="w-full px-2 py-1 bg-background border border-border-subtle text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono-tech text-foreground">
                                {poForm.currency_symbol}{(item.quantity * item.unit_price).toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => setPoForm({ ...poForm, items: poForm.items.filter((_, i) => i !== idx) })}
                                  className="p-1 text-red-400 hover:text-red-600"
                                  title="Remove item"
                                >
                                  <X size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-border-subtle bg-chassis">
                            <td colSpan={4} className="px-3 py-2 text-right text-xs text-muted-foreground font-medium">Order Total ({poForm.currency_code}):</td>
                            <td className="px-3 py-2 text-right font-mono-tech text-sm text-foreground font-bold">
                              {poForm.currency_symbol}{(poForm.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)).toLocaleString()}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreatePO}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create PO"}
                  </button>
                  <button
                    onClick={() => setCreatingPO(false)}
                    className="px-4 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">PO Number</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Supplier</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Amount</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {pos.map((po) => (
                    <tr key={po.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{po.po_number}</td>
                      <td className="px-4 py-3 text-foreground">{po.supplier_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(po.order_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                          po.status === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                          po.status === 'partial' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' :
                          'border-primary/30 text-primary bg-primary/5'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">{po.currency_symbol || po.currency_code || (currencies.find(c => c.is_base)?.symbol ?? 'UGX')}{Number(po.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handlePrintPO(po.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                          title="Print PO"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadPO(po.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                          title="Download PO (PDF)"
                        >
                          <Download size={14} />
                        </button>
                        {po.status !== 'completed' && (
                          <button
                            onClick={() => startGRNFromPO(po.id)}
                            className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                            title="Receive goods — creates the GRN and supplier bill automatically"
                          >
                            Receive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRN Tab */}
        {tab === "grn" && (
          <div>
            {!creatingGRN && (
              <p className="text-xs text-muted-foreground mb-4">
                To receive goods, click <strong>Receive</strong> on a purchase order in the Purchase Orders tab — it creates the GRN and supplier bill together.
              </p>
            )}

            {creatingGRN && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">{selectedPOForGRN ? `Receive PO: ${selectedPOForGRN.po_number}` : "Receive Goods"}</h3>

                <div className="mb-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`px-3 py-2 border text-[10px] font-mono-tech uppercase tracking-widest ${grnStep >= 1 ? "border-primary/30 text-primary bg-primary/5" : "border-border-subtle text-muted-foreground"}`}>
                      1. Select PO
                    </div>
                    <div className={`px-3 py-2 border text-[10px] font-mono-tech uppercase tracking-widest ${grnStep >= 2 ? "border-primary/30 text-primary bg-primary/5" : "border-border-subtle text-muted-foreground"}`}>
                      2. Confirm Qty
                    </div>
                    <div className={`px-3 py-2 border text-[10px] font-mono-tech uppercase tracking-widest ${grnStep >= 3 ? "border-primary/30 text-primary bg-primary/5" : "border-border-subtle text-muted-foreground"}`}>
                      3. GRN + Bill
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {saving
                      ? "Creating GRN and supplier bill..."
                      : !selectedPOForGRN
                        ? "Select a purchase order to begin."
                        : !grnAnyReceiveQty
                          ? "Enter received quantities for at least one item."
                          : "Ready — this will create the GRN and the supplier bill together."}
                  </div>
                </div>

                {/* PO selector */}
                <div className="mb-4">
                  <label className="block text-xs text-muted-foreground mb-1">Purchase Order *</label>
                  <select
                    value={grnForm.po_id || ""}
                    onChange={async (e) => {
                      const id = parseInt(e.target.value);
                      if (id) await startGRNFromPO(id);
                      else { setSelectedPOForGRN(null); setGRNForm(prev => ({ ...prev, po_id: 0, items: [] })); }
                    }}
                    className="w-full px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value="">Select Purchase Order</option>
                    {pos.filter(p => p.status !== 'completed').map(p => (
                      <option key={p.id} value={p.id}>{p.po_number} — {p.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-xs mb-1">Received Date</label>
                  <input
                    type="date"
                    value={grnForm.received_date}
                    onChange={(e) => setGRNForm({ ...grnForm, received_date: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                </div>
                {selectedPOForGRN && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold mb-2">Items from PO</h4>
                    <div className="border border-border-subtle overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-chassis border-b border-border-subtle">
                            <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Item</th>
                            <th className="text-center px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Ordered</th>
                            <th className="text-center px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Remaining</th>
                            <th className="text-right px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Unit Price</th>
                            <th className="text-center px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Receive Qty</th>
                            <th className="text-left px-3 py-2 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {selectedPOForGRN.items.map((poItem, idx) => (
                            <tr key={poItem.id}>
                              <td className="px-3 py-2">{poItem.product_name || poItem.item_name}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">{poItem.quantity}</td>
                              <td className="px-3 py-2 text-center text-muted-foreground">{poItem.quantity - poItem.received_quantity}</td>
                              <td className="px-3 py-2 text-right font-mono-tech">{selectedPOForGRN.currency_symbol || selectedPOForGRN.currency_code || (currencies.find(c => c.is_base)?.symbol ?? 'UGX')}{Number(poItem.unit_price).toLocaleString()}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={poItem.quantity - poItem.received_quantity}
                                  value={grnForm.items[idx]?.received_quantity ?? 0}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[idx].received_quantity = parseInt(e.target.value) || 0;
                                    setGRNForm({ ...grnForm, items: newItems });
                                  }}
                                  className="w-20 px-2 py-1 bg-background border border-border-subtle text-xs text-center"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="Notes"
                                  value={grnForm.items[idx]?.notes || ""}
                                  onChange={(e) => {
                                    const newItems = [...grnForm.items];
                                    newItems[idx].notes = e.target.value;
                                    setGRNForm({ ...grnForm, items: newItems });
                                  }}
                                  className="w-full px-2 py-1 bg-background border border-border-subtle text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <textarea
                  placeholder="GRN Notes"
                  value={grnForm.notes}
                  onChange={(e) => setGRNForm({ ...grnForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border-subtle text-xs mb-4"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGRN}
                    disabled={saving || !selectedPOForGRN || !grnAnyReceiveQty}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Confirm Receipt & Create Bill"}
                  </button>
                  <button
                    onClick={() => { setCreatingGRN(false); setSelectedPOForGRN(null); }}
                    className="px-4 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">GRN Number</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">PO Number</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Supplier</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Items</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {grns.map((grn) => (
                    <tr key={grn.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{grn.grn_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{grn.po_number}</td>
                      <td className="px-4 py-3 text-foreground">{grn.supplier_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(grn.received_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{grn.item_count}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handlePrintGRN(grn.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                          title="Print GRN"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadGRN(grn.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                          title="Download GRN (PDF)"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bills Tab */}
        {tab === "bills" && (
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              Supplier bills are created automatically when goods are received against a purchase order — see the Purchase Orders tab.
            </p>

            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Bill Number</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Supplier</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Amount</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Paid</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{bill.bill_number}</td>
                      <td className="px-4 py-3 text-foreground">{bill.supplier_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(bill.bill_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">{currencies.find(c => c.is_base)?.symbol ?? 'UGX'}{Number(bill.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono-tech text-muted-foreground">{currencies.find(c => c.is_base)?.symbol ?? 'UGX'}{Number(bill.paid_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                          bill.status === 'paid' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                          bill.status === 'partial' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' :
                          'border-red-500/30 text-red-500 bg-red-500/5'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {bill.status !== 'paid' && (
                          <button
                            onClick={() => {
                              handleBillSelectedForPayment(bill.id);
                              setCreatingPayment(true);
                              setTab("payments");
                            }}
                            className="px-2 py-1 text-xs text-primary hover:underline inline-flex items-center gap-1 font-bold"
                            title="Pay Bill"
                          >
                            <Wallet size={14} /> Pay
                          </button>
                        )}
                        <button
                          onClick={() => handlePrintBill(bill.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                          title="Print Bill"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadBill(bill.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                          title="Download Bill (PDF)"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {tab === "payments" && (
          <div>
            <div className="mb-4">
              <button
                onClick={() => setCreatingPayment(!creatingPayment)}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus size={16} /> Record Payment
              </button>
            </div>

            {creatingPayment && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">Record Payment</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={paymentForm.bill_id || ""}
                    onChange={(e) => handleBillSelectedForPayment(e.target.value ? parseInt(e.target.value) : 0)}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value="">Select Bill (auto-fills supplier &amp; amount)</option>
                    {bills.filter(b => b.status !== 'paid').map(b => (
                      <option key={b.id} value={b.id}>{b.bill_number} — {b.supplier_name} — Balance: {(b.total_amount - b.paid_amount).toLocaleString()}</option>
                    ))}
                  </select>
                  <select
                    value={paymentForm.supplier_id}
                    onChange={(e) => setPaymentForm({ ...paymentForm, supplier_id: parseInt(e.target.value) })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value={0}>Supplier (auto-filled from bill)</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <div>
                    <input
                      type="number"
                      placeholder="Amount *"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-background border border-border-subtle text-xs"
                    />
                    {(() => {
                      const selectedBill = bills.find(b => b.id === paymentForm.bill_id);
                      const rate = selectedBill?.exchange_rate;
                      if (!rate || rate === 1) return null;
                      const base = currencies.find(c => c.is_base);
                      const baseAmount = Math.round(paymentForm.amount / rate);
                      return (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Posts to the books as {base?.symbol ?? ""} {baseAmount.toLocaleString()}
                          {" "}(converted from {selectedBill?.currency_symbol} at this PO's locked-in rate)
                        </p>
                      );
                    })()}
                  </div>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                    <option value="card">Card</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Reference (Check #, Transaction ID)"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                </div>
                <textarea
                  placeholder="Notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border-subtle text-xs mb-4"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreatePayment}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Recording..." : "Record Payment"}
                  </button>
                  <button
                    onClick={() => setCreatingPayment(false)}
                    className="px-4 py-2 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="border border-border-subtle overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Payment #</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Supplier</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Bill #</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Amount</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{payment.payment_number}</td>
                      <td className="px-4 py-3 text-foreground">{payment.supplier_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.bill_number || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-mono-tech text-green-500">${Number(payment.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{payment.payment_method.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingConfirm}
        title="Delete Supplier"
        message={pendingConfirm?.message || ""}
        confirmLabel="Delete"
        onConfirm={() => pendingConfirm?.action()}
        onCancel={() => setPendingConfirm(null)}
      />
    </AdminLayout>
  );
}
