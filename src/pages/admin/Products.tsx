import { useEffect, useState } from "react";
import { api, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, Search, RefreshCw, Upload, Download, X, Sparkles } from "lucide-react";

const CATEGORIES = ["all", "cameras", "lenses", "microphones", "teleprompters", "lighting"];

export default function Products() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filtered, setFiltered] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [showSlidePanel, setShowSlidePanel] = useState(false);

  const load = () => {
    setLoading(true);
    api.products.list()
      .then((p) => { setProducts(p); setFiltered(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    let list = products;
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (search) list = list.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(list);
  }, [search, category, products]);

  const handleDelete = async (id: number) => {
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProduct(null);
    } catch (err) {
      alert("Delete failed");
    } finally {
      setConfirmId(null);
    }
  };

  const openEditForm = (product: ApiProduct) => {
    setSelectedProduct(product);
    setShowSlidePanel(true);
  };

  const openNewForm = () => {
    setSelectedProduct(null);
    setShowSlidePanel(true);
  };

  const generateSKU = () => {
    return 'SKU-' + Date.now().toString(36).toUpperCase();
  };

  return (
    <AdminLayout>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <div className="p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Inventory</p>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
            </div>
          </div>

          <div className="flex gap-2 mb-4 p-3 bg-chassis border border-border-subtle">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={openNewForm} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <Plus size={14} /> New product
            </button>
            <button disabled={!selectedProduct} onClick={() => selectedProduct && setConfirmId(selectedProduct.id)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-danger text-xs hover:bg-admin-bg disabled:opacity-50">
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={() => { const csv = 'Name,Category,Brand,Price\n' + filtered.map(p => `${p.name},${p.category},${p.brand},${p.price/100}`).join('\n'); const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); link.download = 'products.csv'; link.click(); }} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <Download size={14} /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <Upload size={14} /> Import
            </button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 bg-chassis border border-border-subtle pl-9 pr-4 text-sm text-foreground" />
            </div>
          </div>
        </div>

        <div className="flex border border-border-subtle">
          <div className="w-64 bg-chassis border-r border-border-subtle">
            <div className="p-4 border-b border-border-subtle">
              <h3 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Categories</h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`w-full text-left px-4 py-3 text-sm transition-colors ${category === c ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-chassis-hover"}`}>
                  <span className="capitalize">{c}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({c === 'all' ? products.length : products.filter(p => p.category === c).length})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 'calc(11 * 3rem)', minHeight: 'calc(11 * 3rem)' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-chassis">
                    <tr className="border-b border-border-subtle">
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Name</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Category</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Brand</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Price</th>
                      <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filtered.map((p) => (
                      <tr key={p.id} onClick={() => openEditForm(p)} className={`cursor-pointer transition-colors ${selectedProduct?.id === p.id ? 'bg-primary/10' : 'hover:bg-chassis'}`}>
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 capitalize">{p.category}</td>
                        <td className="px-4 py-3">{p.brand}</td>
                        <td className="px-4 py-3 font-mono">UGX {(p.price / 100).toFixed(0)}</td>
                        <td className="px-4 py-3"><span className={p.in_stock ? "text-green-600" : "text-red-600"}>{p.in_stock ? "In Stock" : "Out"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {confirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">Delete this product?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmId(null)} className="px-4 py-2 border border-admin-border text-admin-text">Cancel</button>
                <button onClick={() => handleDelete(confirmId)} className="px-4 py-2 bg-admin-danger text-white">Delete</button>
              </div>
            </div>
          </div>
        )}

        {showSlidePanel && <ProductFormSlide product={selectedProduct} onClose={() => setShowSlidePanel(false)} onSave={load} generateSKU={generateSKU} />}
      </div>
    </AdminLayout>
  );
}

function ProductFormSlide({ product, onClose, onSave, generateSKU }: any) {
  const [sku, setSku] = useState(product?.barcode || '');
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'cameras',
    brand: product?.brand || '',
    description: product?.description || '',
    price: product ? product.price / 100 : '',
    specifications: product?.specifications || '',
    expiry_date: '',
    current_stock: product?.quantity_on_hand || '',
    reorder_level: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Generate slug from product name
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const productData = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand,
        description: formData.description,
        price: parseFloat(formData.price.toString()) * 100,
        slug: slug,
        specs: formData.specifications ? [formData.specifications] : [],
        image_url: formData.image_url || '',
        in_stock: true,
        is_featured: false,
        tag: sku || ''
      };

      if (product) {
        await api.products.update(product.id, productData);
      } else {
        await api.products.create(productData);
      }
      
      onSave();
      onClose();
    } catch (err) {
      alert('Failed to save product');
      console.error(err);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" style={{animation: 'fadeIn 0.3s'}}>
      <div className="bg-admin-surface w-full max-w-2xl h-full overflow-y-auto shadow-2xl" style={{animation: 'slideIn 0.3s ease-out'}}>
        <div className="sticky top-0 bg-admin-surface border-b border-admin-border p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-admin-text">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-admin-bg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-admin-text mb-4 uppercase">Basic Information</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-admin-text mb-1">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-admin-text mb-1">Category *</label><select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text">{CATEGORIES.filter(c => c !== 'all').map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div><label className="block text-sm text-admin-text mb-1">Brand</label><input type="text" value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" /></div>
              </div>
              <div><label className="block text-sm text-admin-text mb-1">Description</label><textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"></textarea></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-admin-text mb-4 uppercase">Pricing</h3>
            <div><label className="block text-sm text-admin-text mb-1">Selling Price *</label><input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" required /></div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-admin-text mb-4 uppercase">Product Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-admin-text mb-1">SKU/Barcode</label><div className="flex gap-2"><input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="flex-1 px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" /><button type="button" onClick={() => setSku(generateSKU())} className="px-3 py-2 bg-primary text-white hover:bg-primary/90" title="Generate SKU"><Sparkles size={16} /></button></div></div>
                <div><label className="block text-sm text-admin-text mb-1">Expiry Date</label><input type="date" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" /></div>
              </div>
              <div><label className="block text-sm text-admin-text mb-1">Specifications</label><textarea rows={4} value={formData.specifications} onChange={(e) => setFormData({...formData, specifications: e.target.value})} placeholder="Enter product specifications..." className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text"></textarea></div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-admin-text mb-4 uppercase">Stock Control</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm text-admin-text mb-1">Current Stock</label><input type="number" value={formData.current_stock} onChange={(e) => setFormData({...formData, current_stock: e.target.value})} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" /></div>
              <div><label className="block text-sm text-admin-text mb-1">Reorder Level</label><input type="number" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: e.target.value})} placeholder="Min stock" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text" /></div>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-admin-border">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-admin-border text-admin-text">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white hover:bg-primary/90">{product ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
