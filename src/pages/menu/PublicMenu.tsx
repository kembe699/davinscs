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

interface MenuTable {
  id: number;
  location: string;
  label: string;
}

interface MenuData {
  company: { name: string; logo: string; currency: string };
  products: MenuProduct[];
  tables: MenuTable[];
}

interface CartLine {
  product: MenuProduct;
  quantity: number;
}

// Same brand gradient and corner radius as the Flutter app's
// BrandGradientButton (lib/widgets/brand_gradient_button.dart, Corners.md)
// — this page is the one customer-facing surface that isn't the admin CMS,
// so every primary button here matches the actual POS app the order lands
// in, not the dark/mono "CMS" admin theme the rest of this web app uses.
const BRAND_GRADIENT = "linear-gradient(135deg, #1565C0 0%, #0EA894 50%, #56C02B 100%)";
const BRAND_RADIUS = 14;
const ALL_CATEGORY = "All";

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
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantSlug]);

  // Categories come from the products actually on the menu, not the separate
  // categories table — a product's `category` is free text (no foreign key),
  // so matching against categories.name could silently mismatch on
  // casing/spacing and show an empty list for every tab. Deriving the tabs
  // from the same field used to filter guarantees they always agree.
  const categoryNames = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.products.map((p) => p.category).filter(Boolean)));
  }, [data]);

  const selectedTable = data?.tables.find((t) => t.id === tableId) || null;
  const tableLocations = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.tables.map((t) => t.location)));
  }, [data]);

  const sym = data?.company.currency || "UGX";
  const cartLines = Object.values(cart);
  const cartCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.product.price * l.quantity, 0);

  const visibleProducts = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (activeCategory !== ALL_CATEGORY) list = list.filter((p) => p.category === activeCategory);
    const query = search.trim().toLowerCase();
    if (query) list = list.filter((p) => p.name.toLowerCase().includes(query));
    return list;
  }, [data, activeCategory, search]);

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
    return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400 text-sm">Loading menu…</div>;
  }
  if (error || !data) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-red-500 text-sm px-6 text-center">{error || "Menu not found"}</div>;
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: BRAND_GRADIENT }}
          >
            ✓
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 mb-1">Order sent!</h1>
          <p className="text-sm text-gray-500 mb-1">{orderPlaced.saleNumber}</p>
          <p className="text-base font-bold text-gray-900 mb-4">{formatCurrencySync(orderPlaced.total, sym, true)}</p>
          <p className="text-sm text-gray-500">A member of staff will be with you shortly.</p>
          <button
            onClick={() => setOrderPlaced(null)}
            className="mt-6 h-11 px-6 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Order more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28">
      <div className="px-4 pt-6 pb-4 text-center">
        {data.company.logo && <img src={data.company.logo} alt="" className="h-14 mx-auto mb-2 object-contain" />}
        <h1 className="font-extrabold text-gray-900 text-xl">{data.company.name || "Menu"}</h1>
      </div>

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="overflow-x-auto whitespace-nowrap mb-3">
          {[ALL_CATEGORY, ...categoryNames].map((name) => {
            const selected = activeCategory === name;
            return (
              <button
                key={name}
                onClick={() => setActiveCategory(name)}
                className="inline-block mr-2 px-4 py-2 text-xs font-bold transition-colors"
                style={
                  selected
                    ? { background: BRAND_GRADIENT, color: "white", borderRadius: BRAND_RADIUS }
                    : { border: "1px solid #E5E7EB", color: "#6B7280", background: "white", borderRadius: BRAND_RADIUS }
                }
              >
                {name}
              </button>
            );
          })}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the menu…"
          className="w-full h-11 px-4 border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400"
          style={{ borderRadius: BRAND_RADIUS }}
        />
      </div>

      {visibleProducts.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-16">{search.trim() ? "No items match your search." : "No items in this category yet."}</p>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {visibleProducts.map((product) => {
            const inCart = cart[product.id]?.quantity || 0;
            const soldOut = product.product_type !== "service" && product.available_stock <= 0;
            return (
              <div
                key={product.id}
                onClick={() => !soldOut && addToCart(product)}
                className={`relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col ${soldOut ? "" : "cursor-pointer active:scale-[0.98] transition-transform"}`}
                style={inCart > 0 ? { borderColor: "#0EA894", borderWidth: 1.5 } : undefined}
              >
                {inCart > 0 && (
                  <span
                    className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-extrabold shadow"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {inCart}
                  </span>
                )}
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-300 text-3xl">🍽️</span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                  {product.description && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{product.description}</p>}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span className="font-bold text-sm text-gray-900">{formatCurrencySync(product.price, sym, true)}</span>
                    {soldOut && <span className="text-[10px] font-bold text-red-500">Sold out</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 h-14 flex items-center justify-between px-5 font-bold text-white shadow-lg"
          style={{ background: BRAND_GRADIENT, borderRadius: BRAND_RADIUS }}
        >
          <span>{cartCount} item(s)</span>
          <span>{formatCurrencySync(cartTotal, sym, true)}</span>
        </button>
      )}

      {cartOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-20" onClick={() => setCartOpen(false)}>
          <div
            className="bg-white w-full max-h-[85vh] overflow-y-auto p-5 rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-lg">Your order</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 text-sm font-semibold">
                Close
              </button>
            </div>

            {cartLines.map((line) => (
              <div key={line.product.id} className="flex items-center justify-between py-2.5 border-b border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{line.product.name}</p>
                  <p className="text-xs text-gray-400">{formatCurrencySync(line.product.price, sym, true)} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setQty(line.product, line.quantity - 1)}
                    className="w-7 h-7 font-bold text-white"
                    style={{ background: BRAND_GRADIENT, borderRadius: BRAND_RADIUS }}
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-sm font-bold text-gray-900">{line.quantity}</span>
                  <button
                    onClick={() => setQty(line.product, line.quantity + 1)}
                    disabled={line.product.product_type !== "service" && line.quantity >= line.product.available_stock}
                    className="w-7 h-7 font-bold text-white disabled:opacity-30"
                    style={{ background: BRAND_GRADIENT, borderRadius: BRAND_RADIUS }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between py-3 font-extrabold text-gray-900">
              <span>Total</span>
              <span>{formatCurrencySync(cartTotal, sym, true)}</span>
            </div>

            <label className="block text-xs font-bold text-gray-500 mb-1 mt-3">Your table</label>
            <button
              type="button"
              onClick={() => setTablePickerOpen(true)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm mb-3 flex items-center justify-between"
            >
              <span className={selectedTable ? "text-gray-900 font-semibold" : "text-gray-400"}>
                {selectedTable ? `${selectedTable.location} · ${selectedTable.label}` : "Choose a table…"}
              </span>
              <span className="text-gray-400">▾</span>
            </button>

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm mb-3"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number (optional)"
              className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm mb-3"
            />

            {sendError && <p className="text-red-500 text-sm mb-3">{sendError}</p>}

            <button
              onClick={sendOrder}
              disabled={sending || !tableId || cartLines.length === 0}
              className="w-full h-12 font-bold text-white disabled:opacity-40"
              style={{ background: BRAND_GRADIENT, borderRadius: BRAND_RADIUS }}
            >
              {sending
                ? "Sending…"
                : !tableId
                  ? "Choose a table to continue"
                  : `Send order — ${formatCurrencySync(cartTotal, sym, true)}`}
            </button>
          </div>
        </div>
      )}

      {tablePickerOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-30" onClick={() => setTablePickerOpen(false)}>
          <div
            className="bg-white w-full max-h-[75vh] overflow-y-auto p-5 rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-lg">Choose your table</h2>
              <button onClick={() => setTablePickerOpen(false)} className="text-gray-400 text-sm font-semibold">
                Close
              </button>
            </div>

            {tableLocations.map((location) => (
              <div key={location} className="mb-4">
                {location && <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{location}</p>}
                <div className="grid grid-cols-3 gap-2">
                  {data.tables
                    .filter((t) => t.location === location)
                    .map((t) => {
                      const selected = tableId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setTableId(t.id);
                            setTablePickerOpen(false);
                          }}
                          className="h-11 text-sm font-bold transition-colors"
                          style={
                            selected
                              ? { background: BRAND_GRADIENT, color: "white", borderRadius: BRAND_RADIUS }
                              : { border: "1px solid #E5E7EB", color: "#374151", background: "white", borderRadius: BRAND_RADIUS }
                          }
                        >
                          {t.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
