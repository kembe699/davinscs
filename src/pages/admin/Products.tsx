import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Trash2, Search, RefreshCw, Upload, Download, Edit } from "lucide-react";

const CATEGORIES = ["all", "cameras", "lenses", "microphones", "teleprompters", "lighting"];

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filtered, setFiltered] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<ApiProduct | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

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
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      ((p as any).barcode && (p as any).barcode.toLowerCase().includes(search.toLowerCase()))
    );
    setFiltered(list);
  }, [search, category, products]);

  const handleDelete = async (id: number) => {
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProduct(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Delete failed";
      alert(errorMessage);
    } finally {
      setConfirmId(null);
    }
  };

  const openEditForm = (product: ApiProduct) => {
    navigate(`/admin/products/${product.id}/edit`);
  };

  const openNewForm = () => {
    navigate('/admin/products/new');
  };

  return (
    <AdminLayout>
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
            <button disabled={!selectedProduct} onClick={() => selectedProduct && openEditForm(selectedProduct)} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg disabled:opacity-50">
              <Edit size={14} /> Edit
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
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedProduct(p)} 
                        onDoubleClick={() => openEditForm(p)}
                        className={`cursor-pointer transition-colors ${selectedProduct?.id === p.id ? 'bg-primary/10' : 'hover:bg-chassis'}`}
                      >
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
      </div>
    </AdminLayout>
  );
}
