import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useTenantPath } from "@/contexts/TenantContext";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiProduct, ApiCategory, ApiStorageLocation, ApiProductBatch } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, ArrowLeft, Sparkles, Printer } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { roundToCents } from "@/utils/currency";
import { parseBarcodes, formatBarcodes } from "@/utils/barcode";
import { printBarcodeLabels } from "@/utils/printUtils";
import { DateField } from "@/components/ui/date-field";

type Spec = { label: string; value: string };

const UOM_OPTIONS = [
  { value: "pcs",    label: "Piece (pcs)" },
  { value: "box",    label: "Box" },
  { value: "pack",   label: "Pack" },
  { value: "dozen",  label: "Dozen" },
  { value: "strip",  label: "Strip" },
  { value: "tabs",   label: "Tablets (tabs)" },
  { value: "caps",   label: "Capsules (caps)" },
  { value: "bottle", label: "Bottle" },
  { value: "sachet", label: "Sachet" },
  { value: "kg",     label: "Kilogram (kg)" },
  { value: "g",      label: "Gram (g)" },
  { value: "L",      label: "Litre (L)" },
  { value: "ml",     label: "Millilitre (ml)" },
  { value: "m",      label: "Metre (m)" },
  { value: "roll",   label: "Roll" },
  { value: "pair",   label: "Pair" },
  { value: "set",    label: "Set" },
  { value: "carton", label: "Carton" },
  { value: "tray",   label: "Tray" },
  { value: "tin",    label: "Tin" },
  { value: "bag",    label: "Bag" },
];

const empty = {
  slug: "", name: "", brand: "", price: "" as number | "", cost_price: "" as number | "", tag: "", description: "",
  specs: [] as Spec[], image_url: "", in_stock: true, is_featured: false, category: "",
  barcode: "", expiry_date: "", product_type: "product", quantity_on_hand: "" as number | "", reorder_level: "" as number | "",
  expense_account_id: 0, uom: "pcs", storage_location_id: 0, show_in_pos: true,
};

type Account = { id: number; code: string; name: string; account_type: string };

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const { baseCurrency } = useCurrency();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const tp = useTenantPath();

  const [form, setForm] = useState(empty);
  const [margin, setMargin] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [storageLocations, setStorageLocations] = useState<ApiStorageLocation[]>([]);

  // Batch/lot tracking — opt-in, only meaningful once a product actually
  // exists (needs a real product_id), so this only loads in edit mode.
  const [batches, setBatches] = useState<ApiProductBatch[]>([]);
  const [newBatch, setNewBatch] = useState({ batch_number: "", quantity: "", expiry_date: "", barcode: "" });
  const [savingBatch, setSavingBatch] = useState(false);
  const [adjustingBatchId, setAdjustingBatchId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  const loadBatches = () => {
    if (!isEdit) return;
    api.inventory.batches.list(Number(id)).then(setBatches).catch(() => {});
  };

  useEffect(() => {
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const addBatch = async () => {
    const quantity = Number(newBatch.quantity);
    if (!newBatch.batch_number.trim() || !quantity || quantity <= 0) {
      toast("Batch number and a quantity greater than zero are required.", "error", "Missing info");
      return;
    }
    setSavingBatch(true);
    try {
      await api.inventory.batches.create({
        product_id: Number(id),
        batch_number: newBatch.batch_number.trim(),
        quantity,
        expiry_date: newBatch.expiry_date || undefined,
        barcode: newBatch.barcode.trim() || undefined,
      });
      setNewBatch({ batch_number: "", quantity: "", expiry_date: "", barcode: "" });
      loadBatches();
      toast("Batch added.", "success", "Saved");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add batch", "error", "Error");
    } finally {
      setSavingBatch(false);
    }
  };

  const submitAdjust = async (batchId: number) => {
    const delta = Number(adjustAmount);
    if (!delta) return;
    try {
      await api.inventory.batches.adjust(batchId, delta);
      setAdjustingBatchId(null);
      setAdjustAmount("");
      loadBatches();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not adjust batch", "error", "Error");
    }
  };

  const deleteBatch = async (batch: ApiProductBatch) => {
    if (batch.quantity_on_hand > 0) {
      toast("This batch still has stock — adjust it to zero first.", "error", "Not empty");
      return;
    }
    if (!window.confirm(`Remove batch ${batch.batch_number}?`)) return;
    try {
      await api.inventory.batches.delete(batch.id);
      loadBatches();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove batch", "error", "Error");
    }
  };

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
    api.inventory.storageLocations.list().then(setStorageLocations).catch(() => {});
    fetch("/api/accounting/accounts", {
      headers: { Authorization: `Bearer ${localStorage.getItem("cms_token")}` },
    })
      .then(r => r.json())
      .then((data: Account[]) => setAccounts(data.filter(a => a.account_type === "expense")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.products.list()
      .then((products) => {
        const p = products.find((x) => x.id === Number(id));
        if (!p) return navigate(tp("/admin/products"));
        // Convert expiry_date to yyyy-MM-dd format if it exists
        const expiryDate = (p as any).expiry_date 
          ? new Date((p as any).expiry_date).toISOString().split('T')[0]
          : "";
        
        const cp = p.cost_price ?? "";
        const sp = p.price ?? "";
        setForm({
          slug: p.slug, name: p.name, brand: p.brand, price: sp as number | "", cost_price: cp as number | "",
          tag: p.tag, description: p.description,
          specs: Array.isArray(p.specs) ? p.specs : [],
          image_url: p.image_url, in_stock: p.in_stock, is_featured: p.is_featured, category: p.category,
          barcode: (p as any).barcode || "",
          expiry_date: expiryDate,
          product_type: (p as any).product_type || "product",
          quantity_on_hand: (p as any).quantity_on_hand ?? "" as number | "",
          reorder_level: (p as any).reorder_level ?? "" as number | "",
          expense_account_id: (p as any).expense_account_id || 0,
          uom: (p as any).uom || "pcs",
          storage_location_id: (p as any).storage_location_id || 0,
          show_in_pos: (p as any).show_in_pos ?? true,
        });
        if (cp > 0 && sp > 0) setMargin(Math.round((sp - cp) / cp * 100));
      })
      .catch(() => navigate(tp("/admin/products")))
      .finally(() => setFetching(false));
  }, [id, isEdit, navigate]);

  const set = (key: keyof typeof form, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addSpec = () => set("specs", [...form.specs, { label: "", value: "" }]);
  const updateSpec = (i: number, field: "label" | "value", val: string) => {
    const s = [...form.specs];
    s[i] = { ...s[i], [field]: val };
    set("specs", s);
  };
  const removeSpec = (i: number) => set("specs", form.specs.filter((_, idx) => idx !== i));

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const generateBarcode = () => {
    return 'SKU-' + Date.now().toString(36).toUpperCase();
  };

  const handlePrintBarcode = () => {
    const codes = parseBarcodes((form as any).barcode);
    if (codes.length === 0) {
      toast("Add a barcode first, then print its label.", "warning", "No barcode");
      return;
    }
    const price = form.price !== "" ? `${baseCurrency?.code || 'UGX'} ${Number(form.price).toLocaleString()}` : undefined;
    printBarcodeLabels(codes.map((code) => ({ code, name: form.name || "Product", price })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        description: form.description?.trim() || "",
        barcode: formatBarcodes(parseBarcodes((form as any).barcode)),
      };
      if (isEdit) {
        await api.products.update(Number(id), payload as Partial<ApiProduct>);
        toast("Product updated successfully!", "success", "Saved");
      } else {
        await api.products.create(payload as Partial<ApiProduct>);
        toast("Product created successfully!", "success", "Saved");
      }
      navigate(tp("/admin/products"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <AdminLayout>
        <div className="p-8 font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
          Loading…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(tp("/admin/products"))}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">
              {isEdit ? "Edit" : "New"} Product
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {isEdit ? form.name || "Edit Product" : "Add Product"}
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
          <div className="space-y-6">
              {/* Basic Info Card */}
              <section className="border border-border-subtle p-6 bg-chassis space-y-5">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Product</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="field-label">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      className="field-input appearance-none"
                    >
                      <option value="">— None —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">Product Name *</label>
                    <input
                      required type="text" value={form.name}
                      onChange={(e) => {
                        set("name", e.target.value);
                        if (!isEdit) set("slug", autoSlug(e.target.value));
                      }}
                      placeholder="Insert product name"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Slug *</label>
                    <input
                      required type="text" value={form.slug}
                      onChange={(e) => set("slug", e.target.value)}
                      placeholder="Insert slug"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Brand</label>
                    <input
                      type="text" value={form.brand}
                      onChange={(e) => set("brand", e.target.value)}
                      placeholder="Brand (optional)"
                      className="field-input"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {(form as any).product_type !== 'service' && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => set("in_stock", !form.in_stock)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${form.in_stock ? "bg-primary" : "bg-border-subtle"}`}
                      >
                        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${form.in_stock ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                      <span className="text-sm text-foreground">{form.in_stock ? "In Stock" : "Out of Stock"}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => set("is_featured", !form.is_featured)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.is_featured ? "bg-yellow-500" : "bg-border-subtle"}`}
                    >
                      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${form.is_featured ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm text-foreground">{form.is_featured ? "★ Featured" : "Not Featured"}</span>
                  </div>
                </div>
              </section>

              {/* Pricing & Type Card */}
              <section className="border border-border-subtle p-6 bg-chassis space-y-5">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Price & type</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="field-label">Selling Price ({baseCurrency?.code || 'UGX'}) *</label>
                    <input
                      required type="number" min={0} step="any" value={form.price === 0 ? "" : form.price}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const sp = raw === "" ? "" : raw;
                        set("price", sp as number | "");
                        const spNum = parseFloat(raw);
                        const cpNum = parseFloat(String(form.cost_price));
                        if (!isNaN(spNum) && !isNaN(cpNum) && cpNum > 0) {
                          setMargin(Math.round((spNum - cpNum) / cpNum * 100));
                        }
                      }}
                      placeholder="Insert selling price"
                      className="field-input no-spinner"
                    />
                  </div>
                  <div>
                    <label className="field-label">Unit cost ({baseCurrency?.code || 'UGX'})</label>
                    <input
                      type="number" min={0} step="any" value={form.cost_price === 0 ? "" : form.cost_price}
                      onChange={(e) => {
                        const raw = e.target.value;
                        set("cost_price", raw as unknown as number | "");
                        const cpNum = parseFloat(raw);
                        if (!isNaN(cpNum) && cpNum > 0 && margin !== "") {
                          set("price", roundToCents(cpNum * (1 + Number(margin) / 100)));
                        }
                      }}
                      placeholder="Cost (optional)"
                      className="field-input no-spinner"
                    />
                  </div>
                  <div>
                    <label className="field-label">Margin (%)</label>
                    <input
                      type="number" min={0} step="any" value={margin}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const m = raw === "" ? "" : (raw as unknown as number);
                        setMargin(m);
                        const mNum = parseFloat(raw);
                        const cpNum = parseFloat(String(form.cost_price));
                        if (!isNaN(mNum) && !isNaN(cpNum) && cpNum > 0) {
                          set("price", roundToCents(cpNum * (1 + mNum / 100)));
                        }
                      }}
                      placeholder="Insert margin percentage"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Product type *</label>
                    <select
                      required value={(form as any).product_type}
                      onChange={(e) => set("product_type", e.target.value)}
                      className="field-input appearance-none"
                    >
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Barcode / SKU</label>
                    <div className="flex gap-2">
                      <input
                        type="text" value={(form as any).barcode}
                        onChange={(e) => set("barcode", e.target.value)}
                        onBlur={(e) => set("barcode", formatBarcodes(parseBarcodes(e.target.value)))}
                        onKeyDown={(e) => {
                          // A barcode scanner ends each code with an Enter (or
                          // Tab) keystroke, same as the POS search box — but
                          // this field never loses focus between scans, so
                          // without this the next code's characters just land
                          // right after the previous one with nothing between
                          // them, e.g. "123456789987654321". On Enter, close
                          // off whatever's been typed as a confirmed code and
                          // leave a ", " at the end so the next scan's
                          // characters append after it instead of into it.
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const codes = parseBarcodes((e.target as HTMLInputElement).value);
                            if (codes.length > 0) set("barcode", formatBarcodes(codes) + ", ");
                          }
                        }}
                        placeholder="Optional — scan or type one code, press Enter, then scan the next"
                        className="field-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => set("barcode", formatBarcodes([...parseBarcodes((form as any).barcode), generateBarcode()]))}
                        className="px-3 py-2 bg-primary text-background hover:bg-primary/90 transition-colors"
                        title="Add a generated barcode"
                      >
                        <Sparkles size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintBarcode}
                        className="px-3 py-2 border border-border-subtle text-foreground hover:border-primary/60 transition-colors"
                        title="Print barcode label"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Expiry date</label>
                    <DateField
                      value={(form as any).expiry_date}
                      onChange={(v) => set("expiry_date", v)}
                    />
                  </div>
                  {accounts.length > 0 && (
                    <div className="sm:col-span-2">
                      <label className="field-label">Expense account (COGS)</label>
                      <select
                        value={(form as any).expense_account_id || ""}
                        onChange={(e) => set("expense_account_id", Number(e.target.value) || 0)}
                        className="field-input appearance-none"
                      >
                        <option value="">— None —</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </section>

              {/* Specs */}
              <section className="border border-border-subtle p-6 bg-chassis space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Specifications</h2>
                  <button type="button" onClick={addSpec} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono-tech uppercase tracking-widest">
                    <Plus size={12} /> Add Spec
                  </button>
                </div>
                {form.specs.length === 0 && (
                  <p className="text-xs text-muted-foreground">Optional — skip if not needed.</p>
                )}
                {form.specs.map((spec, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="text" placeholder="Insert attribute label"
                      value={spec.label}
                      onChange={(e) => updateSpec(i, "label", e.target.value)}
                      className="field-input flex-1"
                    />
                    <input
                      type="text" placeholder="Insert attribute value"
                      value={spec.value}
                      onChange={(e) => updateSpec(i, "value", e.target.value)}
                      className="field-input flex-1"
                    />
                    <button type="button" onClick={() => removeSpec(i)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </section>

              {/* Stock Control — only for physical products, not services */}
              {(form as any).product_type !== 'service' && (
                <section className="border border-border-subtle p-6 bg-chassis space-y-5">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Stock</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="field-label">Unit of measure</label>
                      <select
                        value={(form as any).uom}
                        onChange={(e) => set("uom", e.target.value)}
                        className="field-input appearance-none"
                      >
                        {UOM_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="field-label">Reorder level</label>
                      <input
                        type="number" min={0}
                        value={(form as any).reorder_level === 0 ? "" : (form as any).reorder_level}
                        onChange={(e) => set("reorder_level", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Optional"
                        className="field-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="field-label">Quantity in stock</label>
                      <input
                        type="number" min={0}
                        value={(form as any).quantity_on_hand === 0 ? "" : (form as any).quantity_on_hand}
                        onChange={(e) => set("quantity_on_hand", e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Insert quantity in stock"
                        className="field-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="field-label">Storage location</label>
                      <select
                        value={(form as any).storage_location_id || 0}
                        onChange={(e) => set("storage_location_id", Number(e.target.value))}
                        className="field-input appearance-none"
                      >
                        <option value={0}>— Unassigned —</option>
                        {storageLocations.map(sl => (
                          <option key={sl.id} value={sl.id}>{sl.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between py-1">
                      <div>
                        <label className="field-label mb-0">Show in POS</label>
                        <p className="text-[11px] text-muted-foreground">Turn off to keep this item in inventory without it appearing on the POS screen.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => set("show_in_pos", !(form as any).show_in_pos)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${(form as any).show_in_pos ? "bg-primary" : "bg-border-subtle"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${(form as any).show_in_pos ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Batches — opt-in lot tracking, only once the product exists */}
              {(form as any).product_type !== 'service' && isEdit && (
                <section className="border border-border-subtle p-6 bg-chassis space-y-5">
                  <div>
                    <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Batches</h2>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Optional — track this product in separate batches/lots, each with its own quantity,
                      expiry date, and (if printed) its own barcode. Leave empty to keep a single stock total
                      with no batch breakdown.
                    </p>
                  </div>

                  {batches.length > 0 && (
                    <div className="space-y-2">
                      {batches.map((b) => (
                        <div key={b.id} className="flex flex-wrap items-center gap-3 border border-border-subtle px-3 py-2 text-sm">
                          <span className="font-mono-tech text-xs text-foreground">{b.batch_number}</span>
                          <span className="text-muted-foreground">Qty: {b.quantity_on_hand}</span>
                          {b.expiry_date && (
                            <span className="text-muted-foreground">
                              Expires {format(new Date(b.expiry_date), "dd/MM/yyyy")}
                            </span>
                          )}
                          {b.barcode && <span className="text-muted-foreground font-mono-tech text-xs">{b.barcode}</span>}
                          <div className="ml-auto flex items-center gap-2">
                            {adjustingBatchId === b.id ? (
                              <>
                                <input
                                  type="number"
                                  autoFocus
                                  value={adjustAmount}
                                  onChange={(e) => setAdjustAmount(e.target.value)}
                                  placeholder="+/- qty"
                                  className="field-input w-24 py-1"
                                />
                                <button type="button" onClick={() => submitAdjust(b.id)} className="text-primary text-xs font-mono-tech uppercase">
                                  Apply
                                </button>
                                <button type="button" onClick={() => { setAdjustingBatchId(null); setAdjustAmount(""); }} className="text-muted-foreground text-xs">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setAdjustingBatchId(b.id)} className="text-muted-foreground hover:text-foreground text-xs font-mono-tech uppercase tracking-widest">
                                  Adjust
                                </button>
                                <button type="button" onClick={() => deleteBatch(b)} className="text-muted-foreground hover:text-red-400">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="field-label">Batch number</label>
                      <input
                        type="text" value={newBatch.batch_number}
                        onChange={(e) => setNewBatch((v) => ({ ...v, batch_number: e.target.value }))}
                        placeholder="e.g. B2026-10"
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label className="field-label">Quantity</label>
                      <input
                        type="number" min={1} value={newBatch.quantity}
                        onChange={(e) => setNewBatch((v) => ({ ...v, quantity: e.target.value }))}
                        placeholder="0"
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label className="field-label">Expiry date</label>
                      <DateField
                        value={newBatch.expiry_date}
                        onChange={(v) => setNewBatch((prev) => ({ ...prev, expiry_date: v }))}
                      />
                    </div>
                    <div>
                      <label className="field-label">Barcode (optional)</label>
                      <input
                        type="text" value={newBatch.barcode}
                        onChange={(e) => setNewBatch((v) => ({ ...v, barcode: e.target.value }))}
                        placeholder="Scan or type"
                        className="field-input"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addBatch}
                    disabled={savingBatch}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono-tech uppercase tracking-widest disabled:opacity-50"
                  >
                    <Plus size={12} /> {savingBatch ? "Adding…" : "Add Batch"}
                  </button>
                </section>
              )}

              {/* Image URL Card */}
              <section className="border border-border-subtle p-6 bg-chassis space-y-5">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Image</h2>
                
                <div>
                  <label className="field-label">Image URL</label>
                  <input
                    type="text" value={form.image_url}
                    onChange={(e) => set("image_url", e.target.value)}
                    placeholder="https://… (optional)"
                    className="field-input"
                  />
                  {form.image_url && (
                    <div className="mt-3 size-32 border border-border-subtle overflow-hidden">
                      <img src={form.image_url} alt="preview" className="size-full object-cover opacity-80" />
                    </div>
                  )}
                </div>
              </section>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="h-12 px-8 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
            </button>
            <button
              type="button"
              onClick={() => navigate(tp("/admin/products"))}
              className="h-12 px-6 border border-border-subtle text-muted-foreground font-mono-tech text-xs uppercase tracking-widest hover:border-primary/40 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
