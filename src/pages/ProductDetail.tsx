import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { orderViaWhatsApp } from "@/utils/whatsapp";
import { ArrowLeft, Check, X, ShoppingCart, Plus, Minus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { categoryMeta } from "@/data/products";
import type { Category } from "@/data/products";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { useTenantPath } from "@/contexts/TenantContext";
import { useTranslation } from "react-i18next";

const ProductDetail = () => {
  const { baseCurrency } = useCurrency();
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const tp = useTenantPath();
  const { t } = useTranslation();

  const productSlug = slug || id || "";
  const pathSegments = location.pathname.split("/").filter(Boolean);
  // pathSegments[0] is tenantSlug. pathSegments[1] is the category or "product".
  const rawCategory = pathSegments[1] as Category;
  const category = rawCategory === "product" ? undefined : rawCategory;

  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [related, setRelated] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  useEffect(() => {
    if (!productSlug) return;
    setLoading(true);
    api.products.get(productSlug)
      .then(p => {
        setProduct(p);
        return p.category ? api.products.list(p.category) : Promise.resolve([] as ApiProduct[]);
      })
      .then(all => {
        setRelated((all as ApiProduct[]).filter(x => x.slug !== productSlug).slice(0, 4));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono-tech text-muted-foreground uppercase tracking-widest text-sm animate-pulse">
            Loading…
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-6">
          <p className="font-mono-tech text-muted-foreground uppercase tracking-widest text-sm">
            Product not found
          </p>
          <Link
            to={tp("/")}
            className="font-mono-tech text-xs text-primary hover:underline uppercase tracking-widest"
          >
            ← Return Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const productCategory = (product?.category || category) as Category | undefined;
  const meta = productCategory ? categoryMeta[productCategory] : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border-subtle bg-grip/20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 font-mono-tech text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={12} /> Back
          </button>
          {productCategory && (
            <>
              <span className="text-border-subtle">|</span>
              <Link
                to={tp(`/${productCategory}`)}
                className="font-mono-tech text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
              >
                {meta?.title || productCategory}
              </Link>
              <span className="text-muted-foreground font-mono-tech text-[10px]">/</span>
            </>
          )}
          <span className="font-mono-tech text-[10px] text-foreground uppercase tracking-widest truncate max-w-[30ch]">
            {product.name}
          </span>
        </div>
      </div>

      {/* Product Detail */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square bg-grip border border-border-subtle relative overflow-hidden group">
              <div className="absolute top-4 left-4 size-8 border-t border-l border-primary/30 z-10" />
              <div className="absolute top-4 right-4 size-8 border-t border-r border-primary/30 z-10" />
              <div className="absolute bottom-4 left-4 size-8 border-b border-l border-primary/30 z-10" />
              <div className="absolute bottom-4 right-4 size-8 border-b border-r border-primary/30 z-10" />
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <span className="font-mono-tech text-[10px] bg-chassis/90 px-3 py-1 text-primary tracking-[0.3em] uppercase">
                  {product.tag}
                </span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-6 lg:gap-8">
            <div>
              <span className="font-mono-tech text-[10px] text-muted-foreground tracking-[0.4em] uppercase block mb-2">
                {product.brand}
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug mb-4">
                {product.name}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="flex items-center gap-6 py-6 border-y border-border-subtle">
              <div>
                <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                  Price
                </span>
                <span className="text-3xl font-bold text-primary">
                  {formatCurrencySync(product.price, baseCurrency?.symbol || 'UGX', false)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {product.in_stock ? (
                  <>
                    <Check size={14} className="text-primary" />
                    <span className="font-mono-tech text-[10px] text-primary uppercase tracking-widest">
                      {t('storefront.product.inStock')}
                    </span>
                  </>
                ) : (
                  <>
                    <X size={14} className="text-muted-foreground" />
                    <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                      {t('storefront.product.outOfStock')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Quantity</span>
              <div className="flex items-center gap-2 border border-border-subtle">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="px-3 py-2 hover:bg-chassis disabled:opacity-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="font-mono-tech text-sm w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 hover:bg-chassis transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {cartMessage && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-4 py-3 font-mono-tech">
                {cartMessage}
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  setAddingToCart(true);
                  setCartMessage("");
                  try {
                    await api.cart.add(product.id, quantity);
                    const cartItems = await api.cart.get();
                    const hasAddedProduct = cartItems.some((item) => item.product_id === product.id);
                    if (!hasAddedProduct) {
                      throw new Error("Cart could not be verified for this store. Please refresh and try again.");
                    }
                    setCartMessage(`Added ${quantity} item(s) to cart!`);
                    setQuantity(1);
                    setTimeout(() => setCartMessage(""), 3000);
                  } catch (err) {
                    setCartMessage(err instanceof Error ? err.message : "Failed to add to cart");
                  } finally {
                    setAddingToCart(false);
                  }
                }}
                disabled={!product.in_stock || addingToCart}
                className="flex-1 h-14 flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-background font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
              >
                <ShoppingCart size={18} />
                {addingToCart ? "Adding..." : t('storefront.product.addToCart')}
              </button>
            </div>

            {/* Shipping note */}
            <div className="font-mono-tech text-[10px] text-muted-foreground space-y-1 uppercase leading-relaxed">
              <p>[SHIP] Same-day dispatch on in-stock orders placed before 2PM.</p>
              <p>[WARRANTY] All items include manufacturer warranty — see our <Link to={tp("/warranty")} className="text-primary hover:underline">Warranty page</Link>.</p>
              <p>[RETURNS] 30-day hassle-free returns — see <Link to={tp("/returns")} className="text-primary hover:underline">Returns policy</Link>.</p>
            </div>

            {/* Specs Table */}
            <div>
              <h3 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
                Specifications
              </h3>
              <div className="border border-border-subtle">
                {product.specs.map((spec, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 px-4 py-3 ${
                      i < product.specs.length - 1 ? "border-b border-border-subtle" : ""
                    }`}
                  >
                    <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest w-28 shrink-0 pt-0.5">
                      {spec.label}
                    </span>
                    <span className="text-sm text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="border-t border-border-subtle">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-2">
                  You May Also Like
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Related {meta?.title || productCategory || "Products"}
                </h2>
              </div>
              {productCategory && (
                <Link
                  to={tp(`/${productCategory}`)}
                  className="font-mono-tech text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest hidden sm:block"
                >
                  View All →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
              {related.map((p) => (
                <div key={p.slug} className="bg-background">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default ProductDetail;
