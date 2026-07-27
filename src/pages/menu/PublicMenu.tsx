import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { formatCurrencySync } from "@/utils/currency";

interface MenuProduct {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  product_type: string;
  available_stock: number;
}

interface MenuCategory {
  id: number;
  slug: string;
  name: string;
}

interface MenuTable {
  id: number;
  location: string;
  label: string;
}

interface MenuData {
  company: { name: string; logo: string; currency: string };
  categories: MenuCategory[];
  products: MenuProduct[];
  tables: MenuTable[];
}

interface CartLine {
  product: MenuProduct;
  quantity: number;
}

/**
 * The page a diner lands on after scanning the QR code on their table —
 * public, no login. Browse the menu by category, pick a table, build a
 * cart, and send the order — it lands in the POS as a held sale tagged
 * with that table (see POST /api/menu/:tenantSlug/order), so it shows up
 * as an occupied table there automatically.
 */
export default function PublicMenu() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [tableId, setTableId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [orderPlaced, setOrderPlaced] = useState<{ saleNumber: string; total: number } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/menu/${encodeURIComponent(tenantSlug || "")}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not load the menu");
        setData(json);
        if (json.categories.length) setActiveCategory(json.categories[0].name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantSlug]);

  const sym = data?.company.currency || "UGX";
  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.product.price * l.quantity, 0);

  const visibleProducts = useMemo(() => {
    if (!data) return [];
    if (!activeCategory) return data.products;
    return data.products.filter((p) => p.category === activeCategory);
  }, [data, activeCategory]);

  function addToCart(product: MenuProduct) {
    setCart((prev) => {
      const existing = prev[product.id];
      const nextQty = (existing?.quantity || 0) + 1;
      if (product.product_type !== "service" && nextQty > product.available_stock) return prev;
      return { ...prev, [product.id]: { product, quantity: nextQty } };
    });
  }

  function setQty(product: MenuProduct, quantity: number) {
    setCart((prev) => {
      if (quantity <= 0) {
        const { [product.id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product.id]: { product, quantity } };
    });
  }

  async function sendOrder() {
    if (!tableId) {
      setSendError("Please choose your table.");
      return;
    }
    if (cartLines.length === 0) {
      setSendError("Your cart is empty.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/menu/${encodeURIComponent(tenantSlug || "")}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: tableId,
          items: cartLines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
          customer_name: customerName || undefined,
          customer_phone: customerPhone || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send your order");
      setOrderPlaced({ saleNumber: json.sale_number, total: json.total_amount });
      setCart({});
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not send your order");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading menu…</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen flex items-center justify-center text-red-400 text-sm px-6 text-center">{error || "Menu not found"}</div>;
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center border border-border-subtle bg-chassis p-8">
          <h1 className="text-xl font-bold text-foreground mb-2">Order sent!</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {orderPlaced.saleNumber} — {formatCurrencySync(orderPlaced.total, sym, false)}
          </p>
          <p className="text-sm text-muted-foreground">A member of staff will be with you shortly.</p>
          <button
            onClick={() => setOrderPlaced(null)}
            className="mt-6 h-10 px-5 border border-border-subtle text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Order more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="border-b border-border-subtle bg-chassis px-4 py-5 text-center">
        {data.company.logo && <img src={data.company.logo} alt="" className="h-12 mx-auto mb-2 object-contain" />}
        <h1 className="font-bold text-foreground text-lg">{data.company.name || "Menu"}</h1>
      </div>

      <div className="sticky top-0 z-10 bg-background border-b border-border-subtle overflow-x-auto whitespace-nowrap px-4 py-3">
        {data.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name)}
            className={`inline-block mr-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-full transition-colors ${
              activeCategory === cat.name ? "bg-primary text-background" : "border border-border-subtle text-muted-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleProducts.map((product) => {
          const inCart = cart[product.id]?.quantity || 0;
          const soldOut = product.product_type !== "service" && product.available_stock <= 0;
          return (
            <div key={product.id} className="border border-border-subtle bg-chassis p-3 flex gap-3">
              {product.image_url && (
                <img src={product.image_url} alt="" className="w-16 h-16 object-cover rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{product.name}</p>
                {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-sm text-foreground">{formatCurrencySync(product.price, sym, false)}</span>
                  {soldOut ? (
                    <span className="text-[10px] uppercase tracking-widest text-red-400">Sold out</span>
                  ) : inCart === 0 ? (
                    <button
                      onClick={() => addToCart(product)}
                      className="h-8 px-3 bg-primary text-background text-xs font-bold rounded"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(product, inCart - 1)} className="w-7 h-7 border border-border-subtle rounded text-foreground">
                        −
                      </button>
                      <span className="text-sm font-bold text-foreground w-4 text-center">{inCart}</span>
                      <button
                        onClick={() => setQty(product, inCart + 1)}
                        disabled={product.product_type !== "service" && inCart >= product.available_stock}
                        className="w-7 h-7 border border-border-subtle rounded text-foreground disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 h-14 bg-primary text-background rounded-lg flex items-center justify-between px-5 font-bold shadow-lg"
        >
          <span>{cartCount} item(s)</span>
          <span>{formatCurrencySync(cartTotal, sym, false)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-20" onClick={() => setCartOpen(false)}>
          <div className="bg-background w-full max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">Your order</h2>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground">
                Close
              </button>
            </div>

            {cartLines.map((line) => (
              <div key={line.product.id} className="flex items-center justify-between py-2 border-b border-border-subtle">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{line.product.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrencySync(line.product.price, sym, false)} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setQty(line.product, line.quantity - 1)} className="w-7 h-7 border border-border-subtle rounded">
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-bold">{line.quantity}</span>
                  <button
                    onClick={() => setQty(line.product, line.quantity + 1)}
                    disabled={line.product.product_type !== "service" && line.quantity >= line.product.available_stock}
                    className="w-7 h-7 border border-border-subtle rounded disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between py-3 font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrencySync(cartTotal, sym, false)}</span>
            </div>

            <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1 mt-3">Your table</label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : "")}
              className="w-full h-11 px-3 border border-border-subtle bg-background text-foreground text-sm mb-3"
            >
              <option value="">Choose a table…</option>
              {data.tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.location} · {t.label}
                </option>
              ))}
            </select>

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full h-11 px-3 border border-border-subtle bg-background text-foreground text-sm mb-3"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full h-11 px-3 border border-border-subtle bg-background text-foreground text-sm mb-3"
            />

            {sendError && <p className="text-red-400 text-sm mb-3">{sendError}</p>}

            <button
              onClick={sendOrder}
              disabled={sending}
              className="w-full h-12 bg-primary text-background font-bold rounded disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send order — ${formatCurrencySync(cartTotal, sym, false)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
