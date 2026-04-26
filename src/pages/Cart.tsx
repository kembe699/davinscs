import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiCartItem } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { useTenantPath } from "@/contexts/TenantContext";

export default function Cart() {
  const [cartItems, setCartItems] = useState<ApiCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const tp = useTenantPath();

  const loadCart = async () => {
    try {
      const data = await api.cart.get();
      setCartItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCart(); }, []);

  const updateQuantity = async (id: number, newQty: number) => {
    if (newQty < 1) return;
    setUpdating(id);
    try {
      await api.cart.update(id, newQty);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (id: number) => {
    setUpdating(id);
    try {
      await api.cart.remove(id);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUpdating(null);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Shopping Cart</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground animate-pulse">Loading cart...</p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12 border border-border-subtle">
              <ShoppingBag className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h2 className="text-xl font-bold text-foreground mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Add some products to get started</p>
              <Link
                to={tp("/")}
                className="inline-block px-6 py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="border border-border-subtle">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border-b border-border-subtle last:border-b-0">
                      <img
                        src={item.image_url || "/placeholder.svg"}
                        alt={item.name}
                        className="w-24 h-24 object-cover border border-border-subtle"
                      />
                      <div className="flex-1">
                        <Link to={tp(`/product/${item.slug}`)} className="font-bold text-foreground hover:text-primary transition-colors">
                          {item.name}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.price.toLocaleString()} each
                        </p>
                        {item.available < item.quantity && (
                          <p className="text-xs text-red-500 mt-1">
                            Only {item.available} available
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2 border border-border-subtle">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updating === item.id || item.quantity <= 1}
                            className="px-2 py-1 hover:bg-chassis disabled:opacity-50"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-mono-tech text-sm w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={updating === item.id || item.quantity >= item.available}
                            className="px-2 py-1 hover:bg-chassis disabled:opacity-50"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="font-bold text-foreground">
                          {(item.price * item.quantity).toLocaleString()}
                        </p>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="border border-border-subtle p-6 bg-chassis sticky top-4">
                  <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono-tech text-foreground">{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-mono-tech text-foreground">
                        {shipping === 0 ? "FREE" : shipping.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4 mb-6">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="font-bold text-primary text-xl">{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(tp("/checkout"))}
                    className="w-full py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors mb-3"
                  >
                    Proceed to Checkout
                  </button>

                  <Link
                    to={tp("/")}
                    className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
