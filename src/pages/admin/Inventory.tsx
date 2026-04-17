import { useEffect, useState } from "react";
import { api, ApiInventoryItem, ApiStockMovement } from "@/lib/api";
import AdminLayout from "./AdminLayout";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

export default function Inventory() {
  const [items, setItems] = useState<ApiInventoryItem[]>([]);
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [valuation, setValuation] = useState({ total_value: 0, total_products: 0, total_units: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const [itemsData, movementsData, valuationData] = await Promise.all([
        api.inventory.list(),
        api.inventory.movements(),
        api.inventory.valuation(),
      ]);
      setItems(itemsData);
      setMovements(movementsData);
      setValuation(valuationData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdjust = async (productId: number) => {
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty === 0) return;
    
    setSaving(true);
    setError("");
    try {
      await api.inventory.adjust(productId, qty, adjustNotes);
      await load();
      setAdjusting(null);
      setAdjustQty("");
      setAdjustNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === "low") return item.available <= item.reorder_level && item.available > 0;
    if (filter === "out") return item.available <= 0;
    return true;
  });

  const lowStockCount = items.filter(i => i.available <= i.reorder_level && i.available > 0).length;
  const outOfStockCount = items.filter(i => i.available <= 0).length;

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-6">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Stock Management</p>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 font-mono-tech mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-border-subtle p-4 bg-chassis">
            <div className="flex items-center gap-3">
              <Package className="text-primary" size={20} />
              <div>
                <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Total Products</p>
                <p className="text-xl font-bold text-foreground">{valuation.total_products}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-border-subtle p-4 bg-chassis">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-primary" size={20} />
              <div>
                <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Total Units</p>
                <p className="text-xl font-bold text-foreground">{valuation.total_units}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-border-subtle p-4 bg-chassis">
            <div className="flex items-center gap-3">
              <TrendingDown className="text-yellow-500" size={20} />
              <div>
                <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Low Stock</p>
                <p className="text-xl font-bold text-yellow-500">{lowStockCount}</p>
              </div>
            </div>
          </div>
          
          <div className="border border-border-subtle p-4 bg-chassis">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={20} />
              <div>
                <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Out of Stock</p>
                <p className="text-xl font-bold text-red-500">{outOfStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-xs font-mono-tech uppercase tracking-widest transition-colors ${
              filter === "all" ? "bg-primary text-background" : "border border-border-subtle text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`px-4 py-2 text-xs font-mono-tech uppercase tracking-widest transition-colors ${
              filter === "low" ? "bg-yellow-500 text-background" : "border border-border-subtle text-muted-foreground hover:text-foreground"
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilter("out")}
            className={`px-4 py-2 text-xs font-mono-tech uppercase tracking-widest transition-colors ${
              filter === "out" ? "bg-red-500 text-background" : "border border-border-subtle text-muted-foreground hover:text-foreground"
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>

        <div className="border border-border-subtle overflow-hidden mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-chassis">
                <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">On Hand</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Reserved</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Available</th>
                <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Reorder</th>
                <th className="text-right px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                    Loading…
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                    No items found
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                adjusting === item.id ? (
                  <tr key={item.id} className="bg-primary/5 border-l-2 border-primary/40">
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={adjustQty}
                        onChange={(e) => setAdjustQty(e.target.value)}
                        placeholder="+10 or -5"
                        className="w-24 h-8 bg-background border border-border-subtle px-2 text-xs text-center"
                        autoFocus
                      />
                    </td>
                    <td colSpan={2} className="px-4 py-3">
                      <input
                        type="text"
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        placeholder="Reason for adjustment"
                        className="w-full h-8 bg-background border border-border-subtle px-2 text-xs"
                      />
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAdjust(item.id)}
                          disabled={saving || !adjustQty}
                          className="px-3 py-1.5 bg-primary text-background text-xs font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => { setAdjusting(null); setAdjustQty(""); setAdjustNotes(""); }}
                          className="px-3 py-1.5 border border-border-subtle text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr 
                    key={item.id} 
                    onClick={() => setAdjusting(item.id)}
                    className="hover:bg-chassis/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono-tech text-foreground">{item.quantity_on_hand}</td>
                    <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{item.quantity_reserved}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono-tech font-bold ${
                        item.available <= 0 ? "text-red-500" : 
                        item.available <= item.reorder_level ? "text-yellow-500" : 
                        "text-green-500"
                      }`}>
                        {item.available}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono-tech text-muted-foreground">{item.reorder_level}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-muted-foreground font-mono-tech uppercase tracking-widest">
                        Click to adjust
                      </span>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Recent Movements</h2>
          <div className="border border-border-subtle overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-chassis">
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Date</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Product</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Type</th>
                  <th className="text-center px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Quantity</th>
                  <th className="text-left px-4 py-3 font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {movements.slice(0, 20).map((mov) => (
                  <tr key={mov.id} className="hover:bg-chassis/50 transition-colors">
                    <td className="px-4 py-3 font-mono-tech text-[11px] text-muted-foreground">
                      {new Date(mov.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-foreground">{mov.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono-tech text-[10px] uppercase tracking-widest px-2 py-1 border ${
                        mov.movement_type === 'purchase' ? 'border-green-500/30 text-green-500 bg-green-500/5' :
                        mov.movement_type === 'sale' ? 'border-red-500/30 text-red-500 bg-red-500/5' :
                        'border-primary/30 text-primary bg-primary/5'
                      }`}>
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono-tech font-bold ${mov.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{mov.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
