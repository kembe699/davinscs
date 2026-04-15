import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiOrderStats, ApiProduct } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Package, ShoppingBag, TrendingUp, Plus } from "lucide-react";

const CATEGORIES = ["cameras", "lenses", "microphones", "teleprompters", "lighting"];

export default function Dashboard() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [stats, setStats] = useState<ApiOrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.products.list(), api.orders.stats()])
      .then(([p, s]) => { setProducts(p); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categoryCounts = CATEGORIES.map((c) => ({
    name: c,
    count: products.filter((p) => p.category === c).length,
  }));

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Overview</p>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          </div>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 h-10 px-5 bg-primary text-background text-sm font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Add Product
          </Link>
        </div>

        {loading ? (
          <div className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
            Loading…
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Package size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Total Products</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{products.length}</p>
              </div>
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingBag size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Total Orders</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{stats?.total ?? 0}</p>
              </div>
              <div className="border border-border-subtle bg-chassis p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">In Stock</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{products.filter((p) => p.in_stock).length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category breakdown */}
              <div className="border border-border-subtle bg-chassis">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Categories</h2>
                </div>
                <div className="divide-y divide-border-subtle">
                  {categoryCounts.map((c) => (
                    <div key={c.name} className="flex items-center justify-between px-6 py-3">
                      <span className="text-sm text-foreground capitalize">{c.name}</span>
                      <span className="font-mono-tech text-xs text-primary">{c.count} products</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top ordered products */}
              <div className="border border-border-subtle bg-chassis">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Most Ordered</h2>
                </div>
                {stats?.by_product.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {stats?.by_product.slice(0, 6).map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm text-foreground leading-snug">{p.name}</p>
                          <p className="font-mono-tech text-[9px] text-muted-foreground uppercase">{p.category}</p>
                        </div>
                        <span className="font-mono-tech text-xs text-primary">{p.order_count} orders</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent orders */}
              <div className="border border-border-subtle bg-chassis lg:col-span-2">
                <div className="px-6 py-4 border-b border-border-subtle">
                  <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase">Recent Orders</h2>
                </div>
                {stats?.recent.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th className="text-left px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">#</th>
                          <th className="text-left px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product</th>
                          <th className="text-left px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Category</th>
                          <th className="text-left px-6 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {stats?.recent.map((o) => (
                          <tr key={o.id}>
                            <td className="px-6 py-3 font-mono-tech text-[10px] text-muted-foreground">#{o.id}</td>
                            <td className="px-6 py-3 text-foreground">{o.product_name}</td>
                            <td className="px-6 py-3 font-mono-tech text-[10px] text-muted-foreground uppercase">{o.category}</td>
                            <td className="px-6 py-3 font-mono-tech text-[10px] text-muted-foreground">
                              {new Date(o.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
