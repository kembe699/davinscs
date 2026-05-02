import { useEffect, useState } from "react";
import { useTenantPath } from "@/contexts/TenantContext";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiProduct, ApiCategory } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, ArrowLeft, Sparkles } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

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
  expense_account_id: 0, uom: "pcs",
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

  useEffect(() => {
    api.categories.list().then((cats) => {
      setCategories(cats);
      if (!isEdit && cats.length > 0) {
        setForm((f) => f.category === "" ? { ...f, category: cats[0].slug } : f);
      }
    }).catch(() => {});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { ...form, description: form.description?.trim() || "" };
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
                    <label className="field-label">Category *</label>
                    <select
                      required value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      className="field-input appearance-none"
                      disabled={categories.length === 0}
                    >
                      {categories.length === 0 ? (
                        <option value="">No categories — add one first</option>
                      ) : (
                        categories.map((c) => (
                          <option key={c.id} value={c.slug}>{c.name}</option>
                        ))
                      )}
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
                      placeholder="e.g. iPhone 17 Pro Max"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Slug *</label>
                    <input
                      required type="text" value={form.slug}
                      onChange={(e) => set("slug", e.target.value)}
                      placeholder="e.g. iphone-17-pro-max"
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
                      required type="number" min={0} value={form.price === 0 ? "" : form.price}
                      onChange={(e) => {
                        const sp = e.target.value === "" ? "" : Number(e.target.value);
                        set("price", sp);
                        if (form.cost_price && Number(form.cost_price) > 0 && sp !== "" && Number(sp) > 0) {
                          setMargin(Math.round((sp - form.cost_price) / form.cost_price * 100));
                        }
                      }}
                      placeholder="e.g. 1500000"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Unit cost ({baseCurrency?.code || 'UGX'})</label>
                    <input
                      type="number" min={0} value={form.cost_price === 0 ? "" : form.cost_price}
                      onChange={(e) => {
                        const cp = e.target.value === "" ? "" : Number(e.target.value);
                        set("cost_price", cp);
                        if (cp !== "" && cp > 0 && margin !== "") {
                          set("price", Math.round(Number(cp) * (1 + Number(margin) / 100)));
                        }
                      }}
                      placeholder="Cost (optional)"
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Margin (%)</label>
                    <input
                      type="number" min={0} value={margin}
                      onChange={(e) => {
                        const m = e.target.value === "" ? "" : Number(e.target.value);
                        setMargin(m);
                        if (m !== "" && form.cost_price > 0) {
                          set("price", Math.round(form.cost_price * (1 + Number(m) / 100)));
                        }
                      }}
                      placeholder="e.g. 30  →  30% markup"
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
                        placeholder="Optional"
                        className="field-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => set("barcode", generateBarcode())}
                        className="px-3 py-2 bg-primary text-background hover:bg-primary/90 transition-colors"
                        title="Generate Barcode"
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Expiry date</label>
                    <input
                      type="date" value={(form as any).expiry_date}
                      onChange={(e) => set("expiry_date", e.target.value)}
                      className="field-input"
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
                      type="text" placeholder="Label (e.g. Weight)"
                      value={spec.label}
                      onChange={(e) => updateSpec(i, "label", e.target.value)}
                      className="field-input flex-1"
                    />
                    <input
                      type="text" placeholder="Value (e.g. 500g)"
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
                        placeholder="e.g. 10"
                        className="field-input"
                      />
                    </div>
                  </div>
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
