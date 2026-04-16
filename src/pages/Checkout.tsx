import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiCartItem } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Lock } from "lucide-react";

export default function Checkout() {
  const [cartItems, setCartItems] = useState<ApiCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country: "Kenya",
    notes: "",
  });

  useEffect(() => {
    const loadCart = async () => {
      try {
        const data = await api.cart.get();
        setCartItems(data);
        if (data.length === 0) {
          navigate("/cart");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cart");
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const order = await api.checkout.submit(formData);
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setSubmitting(false);
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 0;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="border border-border-subtle p-6 bg-chassis">
                  <h2 className="text-lg font-bold text-foreground mb-4">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customer_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                        className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.customer_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                        className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                        className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border-subtle p-6 bg-chassis">
                  <h2 className="text-lg font-bold text-foreground mb-4">Shipping Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.shipping_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: e.target.value }))}
                        className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shipping_city}
                          onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
                          className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.shipping_postal_code}
                          onChange={(e) => setFormData(prev => ({ ...prev, shipping_postal_code: e.target.value }))}
                          className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Country *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.shipping_country}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_country: e.target.value }))}
                        className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border-subtle p-6 bg-chassis">
                  <h2 className="text-lg font-bold text-foreground mb-4">Additional Notes</h2>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special instructions for your order?"
                    rows={4}
                    className="w-full px-4 py-2 bg-background border border-border-subtle text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="border border-border-subtle p-6 bg-chassis sticky top-4">
                  <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
                  
                  <div className="space-y-3 mb-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-mono-tech text-foreground">
                          ${((item.price * item.quantity) / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border-subtle pt-4 space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-mono-tech text-foreground">${(subtotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-mono-tech text-foreground">FREE</span>
                    </div>
                  </div>

                  <div className="border-t border-border-subtle pt-4 mb-6">
                    <div className="flex justify-between">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="font-bold text-primary text-xl">${(total / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Lock size={16} />
                    {submitting ? "Processing..." : "Place Order"}
                  </button>

                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Payment:</strong> We'll contact you to arrange payment and delivery after you place your order.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
