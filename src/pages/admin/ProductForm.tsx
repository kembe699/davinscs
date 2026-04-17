import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiProduct, ApiCategory } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, ArrowLeft, Sparkles } from "lucide-react";

type Spec = { label: string; value: string };

const empty = {
  slug: "", name: "", brand: "", price: 0, tag: "", description: "",
  specs: [] as Spec[], image_url: "", in_stock: true, is_featured: false, category: "cameras",
  barcode: "", expiry_date: "", product_type: "product", quantity_on_hand: 0, reorder_level: 0,
};

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.products.list()
      .then((products) => {
        const p = products.find((x) => x.id === Number(id));
        if (!p) return navigate("/admin/products");
        setForm({
          slug: p.slug, name: p.name, brand: p.brand, price: p.price,
          tag: p.tag, description: p.description,
          specs: Array.isArray(p.specs) ? p.specs : [],
          image_url: p.image_url, in_stock: p.in_stock, is_featured: p.is_featured, category: p.category,
          barcode: (p as any).barcode || "", expiry_date: (p as any).expiry_date || "",
          product_type: (p as any).product_type || "product",
          quantity_on_hand: (p as any).quantity_on_hand || 0, reorder_level: (p as any).reorder_level || 0,
        });
      })
      .catch(() => navigate("/admin/products"))
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
      if (isEdit) {
        await api.products.update(Number(id), form as Partial<ApiProduct>);
      } else {
        await api.products.create(form as Partial<ApiProduct>);
      }
      navigate("/admin/products");
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
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/admin/products")}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info and Specifications in Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Basic Info */}
            <section className="lg:col-span-6 border border-border-subtle p-6 bg-chassis space-y-5">
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Basic Info</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="field-label">Product Name *</label>
                <input
                  required type="text" value={form.name}
                  onChange={(e) => {
                    set("name", e.target.value);
                    if (!isEdit) set("slug", autoSlug(e.target.value));
                  }}
                  placeholder="Sony FX3 Full-Frame Cinema Camera"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Slug *</label>
                <input
                  required type="text" value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="sony-fx3"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Brand *</label>
                <input
                  required type="text" value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Sony"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Category *</label>
                <select
                  required value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="field-input appearance-none"
                >
                  {categories.length > 0
                    ? categories.map((c) => (
                        <option key={c.id} value={c.slug}>{c.name}</option>
                      ))
                    : ["cameras","lenses","microphones","teleprompters","lighting"].map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))
                  }
                </select>
              </div>
              <div>
                <label className="field-label">Price (UGX) *</label>
                <input
                  required type="number" min={0} value={form.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                  placeholder="795000"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Product Type *</label>
                <select
                  required value={(form as any).product_type}
                  onChange={(e) => set("product_type", e.target.value)}
                  className="field-input appearance-none"
                >
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="field-label">Barcode/SKU</label>
                <div className="flex gap-2">
                  <input
                    type="text" value={(form as any).barcode}
                    onChange={(e) => set("barcode", e.target.value)}
                    placeholder="SKU-ABC123"
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
                <label className="field-label">Expiry Date</label>
                <input
                  type="date" value={(form as any).expiry_date}
                  onChange={(e) => set("expiry_date", e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Description</label>
              <textarea
                rows={3} value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A compact full-frame cinema camera…"
                className="field-input resize-none"
              />
            </div>

            <div>
              <label className="field-label">Image URL</label>
              <input
                type="text" value={form.image_url}
                onChange={(e) => set("image_url", e.target.value)}
                placeholder="/products/sony-fx3.jpg"
                className="field-input"
              />
              {form.image_url && (
                <div className="mt-2 size-20 border border-border-subtle overflow-hidden">
                  <img src={form.image_url} alt="preview" className="size-full object-cover opacity-80" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
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

            {/* Specs */}
            <section className="lg:col-span-6 border border-border-subtle p-6 bg-chassis space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Specifications</h2>
              <button type="button" onClick={addSpec} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono-tech uppercase tracking-widest">
                <Plus size={12} /> Add Spec
              </button>
            </div>
            {form.specs.length === 0 && (
              <p className="text-xs text-muted-foreground">No specs added yet.</p>
            )}
            {form.specs.map((spec, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input
                  type="text" placeholder="Label (e.g. Sensor)"
                  value={spec.label}
                  onChange={(e) => updateSpec(i, "label", e.target.value)}
                  className="field-input flex-1"
                />
                <input
                  type="text" placeholder="Value (e.g. Full-Frame CMOS)"
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
          </div>

          {/* Stock Control */}
          <section className="border border-border-subtle p-6 bg-chassis space-y-5">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Stock Control</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="field-label">Current Stock</label>
                <input
                  type="number" min={0} value={(form as any).quantity_on_hand}
                  onChange={(e) => set("quantity_on_hand", Number(e.target.value))}
                  placeholder="0"
                  className="field-input"
                />
                <p className="text-xs text-muted-foreground mt-1">Available quantity in stock</p>
              </div>
              <div>
                <label className="field-label">Reorder Level</label>
                <input
                  type="number" min={0} value={(form as any).reorder_level}
                  onChange={(e) => set("reorder_level", Number(e.target.value))}
                  placeholder="10"
                  className="field-input"
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum stock before reorder alert</p>
              </div>
            </div>
          </section>

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
              onClick={() => navigate("/admin/products")}
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
