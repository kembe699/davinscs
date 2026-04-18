import { useEffect, useState } from "react";
import { api, ApiSupplier, ApiPurchaseOrder, ApiProduct, ApiGRN, ApiSupplierBill, ApiSupplierPayment, ApiCurrency } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Check, X, Package, FileText, DollarSign, Printer, Mail, Download } from "lucide-react";

type Tab = "suppliers" | "purchase-orders" | "grn" | "bills" | "payments";

export default function ProcurementEnhanced() {
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
  
  // Supplier form
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  
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
  
  // Bill form
  const [creatingBill, setCreatingBill] = useState(false);
  const [billForm, setBillForm] = useState({
    supplier_id: 0,
    grn_id: undefined as number | undefined,
    po_id: undefined as number | undefined,
    bill_date: new Date().toISOString().split('T')[0],
    due_date: "",
    total_amount: 0,
    notes: ""
  });
  
  // Payment form
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    supplier_id: 0,
    bill_id: undefined as number | undefined,
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: "bank_transfer",
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
  }, []);

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) return;
    setSaving(true);
    setError("");
    try {
      if (editingSupplierId) {
        await api.procurement.suppliers.update(editingSupplierId, supplierForm);
      } else {
        await api.procurement.suppliers.create(supplierForm);
      }
      await loadSuppliers();
      setEditingSupplierId(null);
      setAddingSupplier(false);
      setSupplierForm({ name: "", contact_person: "", email: "", phone: "", address: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await api.procurement.suppliers.delete(id);
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
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
      await loadPOs();
      setCreatingPO(false);
      setPoForm({
        supplier_id: 0,
        order_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setSaving(false);
    }
  };

  const handleGRNSelectedForBill = async (grnId: number) => {
    if (!grnId) {
      setBillForm(prev => ({ ...prev, grn_id: undefined, supplier_id: 0, po_id: undefined, total_amount: 0 }));
      return;
    }
    try {
      const grn = await api.procurement.grn.get(grnId);
      const total = grn.items.reduce((sum, item) => sum + item.ordered_quantity * item.unit_price, 0);
      setBillForm(prev => ({
        ...prev,
        grn_id: grnId,
        supplier_id: grn.supplier_id,
        po_id: grn.po_id || undefined,
        total_amount: total,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GRN");
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
      await api.procurement.grn.create(grnForm);
      await Promise.all([loadGRNs(), loadPOs()]);
      setCreatingGRN(false);
      setSelectedPOForGRN(null);
      setGRNForm({
        po_id: 0,
        received_date: new Date().toISOString().split('T')[0],
        notes: "",
        items: []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create GRN");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBill = async () => {
    if (!billForm.supplier_id || !billForm.total_amount) {
      setError("Supplier and amount required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.procurement.bills.create(billForm);
      await loadBills();
      setCreatingBill(false);
      setBillForm({
        supplier_id: 0,
        grn_id: undefined,
        po_id: undefined,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: "",
        total_amount: 0,
        notes: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill");
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
      setCreatingPayment(false);
      setPaymentForm({
        supplier_id: 0,
        bill_id: undefined,
        payment_date: new Date().toISOString().split('T')[0],
        amount: 0,
        payment_method: "bank_transfer",
        reference: "",
        notes: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPO = async (id: number) => {
    try {
      const data = await api.procurement.purchaseOrders.print(id);
      // Open print dialog with data
      window.print();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Print failed");
    }
  };

  const handlePrintGRN = async (id: number) => {
    try {
      const data = await api.procurement.grn.print(id);
      window.print();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Print failed");
    }
  };

  const handlePrintBill = async (id: number) => {
    try {
      const data = await api.procurement.bills.print(id);
      window.print();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Print failed");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PO");
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
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
            <div className="mb-4">
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Contact</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Email</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Phone</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{supplier.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.contact_person || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.email || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.phone || "—"}</td>
                      <td className="px-4 py-3 text-right">
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
                  ))}
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
                                      unit_price: prod ? (prod.cost_price ?? prod.price) : newItems[idx].unit_price,
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
                                    placeholder="e.g. Samsung 65' TV"
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
                                  placeholder="e.g. 5000 = $50.00"
                                  min={0}
                                  value={item.unit_price || ""}
                                  onChange={(e) => {
                                    const newItems = [...poForm.items];
                                    newItems[idx].unit_price = parseInt(e.target.value) || 0;
                                    setPoForm({ ...poForm, items: newItems });
                                  }}
                                  className="w-full px-2 py-1 bg-background border border-border-subtle text-xs text-right"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono-tech text-foreground">
                                {poForm.currency_symbol}{((item.quantity * item.unit_price) / 100).toLocaleString()}
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
                              {poForm.currency_symbol}{(poForm.items.reduce((s, i) => s + i.quantity * i.unit_price, 0) / 100).toLocaleString()}
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
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">{po.currency_symbol || po.currency_code || (currencies.find(c => c.is_base)?.symbol ?? 'UGX')}{(po.total_amount / 100).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handlePrintPO(po.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                          title="Print PO"
                        >
                          <Printer size={14} />
                        </button>
                        {po.status !== 'completed' && (
                          <button
                            onClick={() => startGRNFromPO(po.id)}
                            className="px-2 py-1 text-xs text-primary hover:underline ml-2"
                            title="Create GRN"
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
              <div className="mb-4">
                <button
                  onClick={() => { setCreatingGRN(true); setSelectedPOForGRN(null); setGRNForm({ po_id: 0, received_date: new Date().toISOString().split('T')[0], notes: "", items: [] }); }}
                  className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 flex items-center gap-2"
                >
                  <Plus size={16} /> New GRN
                </button>
              </div>
            )}

            {creatingGRN && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">{selectedPOForGRN ? `Create GRN for PO: ${selectedPOForGRN.po_number}` : "Create GRN"}</h3>

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
                              <td className="px-3 py-2 text-right font-mono-tech">{selectedPOForGRN.currency_symbol || selectedPOForGRN.currency_code || (currencies.find(c => c.is_base)?.symbol ?? 'UGX')}{(poItem.unit_price / 100).toLocaleString()}</td>
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
                    disabled={saving || !selectedPOForGRN}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create GRN"}
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
            <div className="mb-4">
              <button
                onClick={() => setCreatingBill(!creatingBill)}
                className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 flex items-center gap-2"
              >
                <Plus size={16} /> New Bill
              </button>
            </div>

            {creatingBill && (
              <div className="border border-border-subtle p-4 mb-4 bg-chassis">
                <h3 className="text-sm font-bold mb-4">New Bill</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <select
                    value={billForm.supplier_id}
                    onChange={(e) => setBillForm({ ...billForm, supplier_id: parseInt(e.target.value) })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value={0}>Select Supplier *</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select
                    value={billForm.grn_id || ""}
                    onChange={(e) => handleGRNSelectedForBill(e.target.value ? parseInt(e.target.value) : 0)}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value="">Select GRN (auto-fills supplier &amp; amount)</option>
                    {grns.map(g => <option key={g.id} value={g.id}>{g.grn_number} — {g.supplier_name}</option>)}
                  </select>
                  <input
                    type="date"
                    value={billForm.bill_date}
                    onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="date"
                    placeholder="Due Date"
                    value={billForm.due_date}
                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Total Amount *"
                    value={billForm.total_amount}
                    onChange={(e) => setBillForm({ ...billForm, total_amount: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                </div>
                <textarea
                  placeholder="Notes"
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border-subtle text-xs mb-4"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBill}
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Bill"}
                  </button>
                  <button
                    onClick={() => setCreatingBill(false)}
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
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">{currencies.find(c => c.is_base)?.symbol ?? 'UGX'}{(bill.total_amount / 100).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono-tech text-muted-foreground">{currencies.find(c => c.is_base)?.symbol ?? 'UGX'}{(bill.paid_amount / 100).toLocaleString()}</td>
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
                        <button
                          onClick={() => handlePrintBill(bill.id)}
                          className="px-2 py-1 text-xs text-primary hover:underline"
                          title="Print Bill"
                        >
                          <Printer size={14} />
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
                      <option key={b.id} value={b.id}>{b.bill_number} — {b.supplier_name} — Balance: ${((b.total_amount - b.paid_amount) / 100).toFixed(2)}</option>
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
                  <input
                    type="number"
                    placeholder="Amount *"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  />
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="px-3 py-2 bg-background border border-border-subtle text-xs"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
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
                      <td className="px-4 py-3 text-right font-mono-tech text-green-500">${(payment.amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{payment.payment_method.replace('_', ' ')}</td>
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
