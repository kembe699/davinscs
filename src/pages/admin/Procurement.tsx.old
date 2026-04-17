import { useEffect, useState } from "react";
import { api, ApiSupplier, ApiPurchaseOrder, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Check, X, Package } from "lucide-react";

type Tab = "suppliers" | "purchase-orders";

export default function Procurement() {
  const [tab, setTab] = useState<Tab>("suppliers");
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [pos, setPOs] = useState<ApiPurchaseOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  
  const [creatingPO, setCreatingPO] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_id: 0,
    order_date: new Date().toISOString().split('T')[0],
    notes: "",
    items: [] as { product_id: number; quantity: number; unit_price: number }[]
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
      await Promise.all([loadSuppliers(), loadPOs(), loadProducts()]);
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
      setError(err instanceof Error ? err.message : "Create PO failed");
    } finally {
      setSaving(false);
    }
  };

  const addPOItem = () => {
    setPoForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: 0, quantity: 1, unit_price: 0 }]
    }));
  };

  const updatePOItem = (index: number, field: string, value: any) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removePOItem = (index: number) => {
    setPoForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
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
          <button
            onClick={() => setTab("suppliers")}
            className={`px-4 py-2 text-sm font-mono-tech uppercase tracking-widest transition-colors ${
              tab === "suppliers" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setTab("purchase-orders")}
            className={`px-4 py-2 text-sm font-mono-tech uppercase tracking-widest transition-colors ${
              tab === "purchase-orders" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Purchase Orders
          </button>
        </div>

        {tab === "suppliers" && (
          <div>
            <div className="flex justify-end mb-4">
              {!editingSupplierId && (
                <button
                  onClick={() => setEditingSupplierId(-1)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> Add Supplier
                </button>
              )}
            </div>

            {editingSupplierId === -1 && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">New Supplier</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Supplier Name *"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={supplierForm.contact_person}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="field-input"
                  />
                  <input
                    type="text"
                    placeholder="Address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                    className="field-input col-span-2"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSaveSupplier}
                    disabled={saving || !supplierForm.name}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSupplierId(null);
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
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{supplier.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.contact_person || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.email || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{supplier.phone || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
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

        {tab === "purchase-orders" && (
          <div>
            <div className="flex justify-end mb-4">
              {!creatingPO && (
                <button
                  onClick={() => setCreatingPO(true)}
                  className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90"
                >
                  <Plus size={14} /> Create PO
                </button>
              )}
            </div>

            {creatingPO && (
              <div className="border border-primary/40 bg-primary/5 p-4 mb-4">
                <h3 className="font-bold text-foreground mb-3">New Purchase Order</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Supplier *</label>
                    <select
                      value={poForm.supplier_id}
                      onChange={(e) => setPoForm(prev => ({ ...prev, supplier_id: Number(e.target.value) }))}
                      className="field-input"
                    >
                      <option value={0}>Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Order Date</label>
                    <input
                      type="date"
                      value={poForm.order_date}
                      onChange={(e) => setPoForm(prev => ({ ...prev, order_date: e.target.value }))}
                      className="field-input"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Notes</label>
                    <textarea
                      value={poForm.notes}
                      onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="field-input"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-mono-tech text-muted-foreground uppercase tracking-widest">Items *</label>
                    <button
                      onClick={addPOItem}
                      className="text-xs text-primary hover:text-primary/80 font-mono-tech uppercase tracking-widest"
                    >
                      + Add Item
                    </button>
                  </div>
                  {poForm.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => updatePOItem(index, 'product_id', Number(e.target.value))}
                        className="field-input col-span-5"
                      >
                        <option value={0}>Select Product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updatePOItem(index, 'quantity', Number(e.target.value))}
                        className="field-input col-span-2"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price (cents)"
                        value={item.unit_price}
                        onChange={(e) => updatePOItem(index, 'unit_price', Number(e.target.value))}
                        className="field-input col-span-4"
                      />
                      <button
                        onClick={() => removePOItem(index)}
                        className="col-span-1 text-red-500 hover:text-red-400 text-xs"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreatePO}
                    disabled={saving || !poForm.supplier_id || poForm.items.length === 0}
                    className="px-4 py-2 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Creating…" : "Create PO"}
                  </button>
                  <button
                    onClick={() => {
                      setCreatingPO(false);
                      setPoForm({
                        supplier_id: 0,
                        order_date: new Date().toISOString().split('T')[0],
                        notes: "",
                        items: []
                      });
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
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">PO Number</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Supplier</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Total</th>
                    <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        Loading…
                      </td>
                    </tr>
                  ) : pos.map((po) => (
                    <tr key={po.id} className="hover:bg-chassis/50 transition-colors">
                      <td className="px-4 py-3 font-mono-tech text-foreground">{po.po_number}</td>
                      <td className="px-4 py-3 text-foreground">{po.supplier_name}</td>
                      <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">
                        {new Date(po.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                          po.status === 'completed' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                          po.status === 'partial' ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' :
                          'border-primary/30 text-primary bg-primary/5'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-tech text-foreground">
                        ${(po.total_amount / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">
                        {po.item_count}
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
