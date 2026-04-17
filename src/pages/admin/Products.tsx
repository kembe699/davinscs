import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Plus, Pencil, Trash2, Search, RefreshCw, FolderPlus, FolderEdit, FolderMinus, Upload, Download, Printer, FileText, Tag, ArrowUpDown, HelpCircle } from "lucide-react";

const CATEGORIES = ["all", "cameras", "lenses", "microphones", "teleprompters", "lighting"];

export default function Products() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filtered, setFiltered] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryAction, setCategoryAction] = useState<'new' | 'edit' | 'delete'>('new');
  const [selectedCategory, setSelectedCategory] = useState('');

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
    setDeletingId(id);
    try {
      await api.products.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Inventory</p>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-chassis border border-border-subtle">
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Refresh"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={() => { setCategoryAction('new'); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="New group"
            >
              <FolderPlus size={14} />
              New group
            </button>
            <button
              onClick={() => { setCategoryAction('edit'); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Edit group"
            >
              <FolderEdit size={14} />
              Edit group
            </button>
            <button
              onClick={() => { setCategoryAction('delete'); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Delete group"
            >
              <FolderMinus size={14} />
              Delete group
            </button>
            <Link
              to="/admin/products/new"
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="New product"
            >
              <Plus size={14} />
              New product
            </Link>
            <button
              disabled={selectedProducts.length !== 1}
              onClick={() => selectedProducts[0] && window.location.href = `/admin/products/${selectedProducts[0]}/edit`}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg disabled:opacity-50"
              title="Edit product"
            >
              <Pencil size={14} />
              Edit product
            </button>
            <button
              disabled={selectedProducts.length === 0}
              onClick={() => selectedProducts.length > 0 && setConfirmId(selectedProducts[0])}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-danger text-xs hover:bg-admin-bg disabled:opacity-50"
              title="Delete product"
            >
              <Trash2 size={14} />
              Delete product
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Import"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Export"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Print"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Save as PDF"
            >
              <FileText size={14} />
              Save as PDF
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Price tags"
            >
              <Tag size={14} />
              Price tags
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Sorting"
            >
              <ArrowUpDown size={14} />
              Sorting
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-admin-surface border border-admin-border text-admin-text text-xs hover:bg-admin-bg"
              title="Help"
            >
              <HelpCircle size={14} />
              Help
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-chassis border border-border-subtle pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-10 px-3 font-mono-tech text-[10px] uppercase tracking-widest border transition-colors ${
                  category === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border-subtle text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse py-8">Loading…</div>
        ) : (
          <div className="border border-border-subtle overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Image</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Category</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Price (UGX)</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Stock</th>
                  <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                      No products found
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="size-10 border border-border-subtle overflow-hidden bg-grip shrink-0">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="size-full object-cover opacity-80" />
                        ) : (
                          <div className="size-full bg-grip" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.is_featured && (
                          <span className="text-yellow-400 text-xs shrink-0" title="Featured">★</span>
                        )}
                        <p className="font-medium text-foreground leading-snug">{p.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono-tech text-[10px] uppercase text-muted-foreground">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 font-mono-tech text-sm text-primary">
                      {p.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono-tech text-[9px] uppercase tracking-widest px-2 py-1 border ${
                        p.in_stock
                          ? "border-green-500/30 text-green-400 bg-green-500/10"
                          : "border-red-500/30 text-red-400 bg-red-500/10"
                      }`}>
                        {p.in_stock ? "In Stock" : "Out"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          <Pencil size={11} /> Edit
                        </Link>
                        {confirmId === p.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              {deletingId === p.id ? "…" : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="px-3 py-1.5 text-xs border border-border-subtle text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(p.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:border-red-500/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mt-4">
          Showing {filtered.length} of {products.length} products
        </p>
      </div>
    </AdminLayout>
  );
}
