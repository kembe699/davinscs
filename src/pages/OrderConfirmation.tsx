import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ApiCustomerOrder } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, Mail, Package } from "lucide-react";

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<ApiCustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return;
      try {
        const data = await api.checkout.getOrder(Number(id));
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground animate-pulse">Loading order...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-red-500 mb-4">{error || "Order not found"}</p>
            <Link to="/" className="text-primary hover:text-primary/80">
              Return to Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
            <h1 className="text-3xl font-bold text-foreground mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Thank you for your order. We've received it and will contact you shortly.
            </p>
          </div>

          <div className="border border-border-subtle p-6 bg-chassis mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-mono-tech text-lg font-bold text-foreground">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-mono-tech text-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <div className="flex items-start gap-3 mb-4">
                <Mail className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-bold text-foreground mb-1">Confirmation Email Sent</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a confirmation email to <strong>{order.customer_email}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Package className="text-primary mt-1" size={20} />
                <div>
                  <p className="font-bold text-foreground mb-1">Next Steps</p>
                  <p className="text-sm text-muted-foreground">
                    Our team will contact you shortly to arrange payment and delivery details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border-subtle p-6 bg-chassis mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Order Details</h2>
            
            <div className="space-y-3 mb-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="text-foreground">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(item.product_price).toLocaleString()} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-mono-tech text-foreground">
                    {Number(item.subtotal).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border-subtle pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-tech text-foreground">
                  {Number(order.subtotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-mono-tech text-foreground">
                  {order.shipping_cost === 0 ? "FREE" : Number(order.shipping_cost).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border-subtle">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-primary text-xl">
                  {Number(order.total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-border-subtle p-6 bg-chassis mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Shipping Address</h2>
            <div className="text-sm text-muted-foreground">
              <p className="text-foreground font-medium">{order.customer_name}</p>
              <p>{order.shipping_address}</p>
              <p>{order.shipping_city}, {order.shipping_postal_code}</p>
              <p>{order.shipping_country}</p>
              {order.customer_phone && <p className="mt-2">Phone: {order.customer_phone}</p>}
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
