import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Search, RefreshCw } from "lucide-react";

const CATEGORIES = ["all", "cameras", "lenses", "microphones", "teleprompters", "lighting"];

export default function Products() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filtered, setFiltered] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
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
      p.brand.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(list);
  }, [search, category, products]);

  const handleDelete = async (id: number) => {
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedProducts([]);
    } catch (err) {
      alert("Delete failed");
    } finally {
      setConfirmId(null);
    }
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

          {/* Toolbar */}
          <div className="flex gap-2 mb-4 p-3 bg-chassis border border-border-subtle">
            <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <RefreshCw size={14} /> Refresh
            </button>
            <Link to="/admin/products/new" className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg">
              <Plus size={14} /> New product
            </Link>
            <button
              disabled={selectedProducts.length !== 1}
              onClick={() => selectedProducts[0] && (window.location.href = `/admin/products/${selectedProducts[0]}/edit`)}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg disabled:opacity-50"
            >
              <Pencil size={14} /> Edit product
            </button>
            <button
              disabled={selectedProducts.length === 0}
              onClick={() => selectedProducts[0] && setConfirmId(selectedProducts[0])}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-danger text-xs hover:bg-admin-bg disabled:opacity-50"
            >
              <Trash2 size={14} /> Delete product
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-chassis border border-border-subtle pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60"
              />
            </div>
          </div>
        </div>

        {/* Categories + Products */}
        <div className="flex border border-border-subtle">
          {/* Categories Sidebar */}
          <div className="w-64 bg-chassis border-r border-border-subtle">
            <div className="p-4 border-b border-border-subtle">
              <h3 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Categories</h3>
            </div>
            <div className="divide-y divide-border-subtle">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    category === c ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-chassis-hover"
                  }`}
                >
                  <span className="capitalize">{c}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({c === 'all' ? products.length : products.filter(p => p.category === c).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading…</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle bg-chassis">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === filtered.length && filtered.length > 0}
                        onChange={(e) => setSelectedProducts(e.target.checked ? filtered.map(p => p.id) : [])}
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Category</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Brand</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Price</th>
                    <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-chassis">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(p.id)}
                          onChange={(e) => {
                            setSelectedProducts(e.target.checked 
                              ? [...selectedProducts, p.id] 
                              : selectedProducts.filter(id => id !== p.id)
                            );
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3 capitalize">{p.category}</td>
                      <td className="px-4 py-3">{p.brand}</td>
                      <td className="px-4 py-3 font-mono">UGX {(p.price / 100).toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <span className={p.in_stock ? "text-green-600" : "text-red-600"}>
                          {p.in_stock ? "In Stock" : "Out"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {confirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-surface border border-admin-border p-6 max-w-md">
              <h3 className="text-lg font-bold text-admin-text mb-4">Confirm Delete</h3>
              <p className="text-admin-text-secondary mb-6">Are you sure you want to delete this product?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmId(null)} className="px-4 py-2 border border-admin-border text-admin-text hover:bg-admin-bg">
                  Cancel
                </button>
                <button onClick={() => handleDelete(confirmId)} className="px-4 py-2 bg-admin-danger text-white hover:opacity-90">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
