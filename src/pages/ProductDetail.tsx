import { useParams, Link, useNavigate } from "react-router-dom";
import { orderViaWhatsApp } from "@/utils/whatsapp";
import { ArrowLeft, Check, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { allProducts, productsByCategory, categoryMeta } from "@/data/products";
import type { Category } from "@/data/products";

const ProductDetail = () => {
  const { category, id } = useParams<{ category: Category; id: string }>();
  const navigate = useNavigate();

  const product = allProducts.find(
    (p) => p.category === category && p.id === id
  );

  if (!product || !category) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-6">
          <p className="font-mono-tech text-muted-foreground uppercase tracking-widest text-sm">
            Product not found
          </p>
          <Link
            to="/"
            className="font-mono-tech text-xs text-primary hover:underline uppercase tracking-widest"
          >
            ← Return Home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const meta = categoryMeta[category];
  const related = productsByCategory[category]
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

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
          <span className="text-border-subtle">|</span>
          <Link
            to={`/${category}`}
            className="font-mono-tech text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
          >
            {meta.title}
          </Link>
          <span className="text-muted-foreground font-mono-tech text-[10px]">/</span>
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
                src={product.image}
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
                  UGX {product.price.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <Check size={14} className="text-primary" />
                    <span className="font-mono-tech text-[10px] text-primary uppercase tracking-widest">
                      In Stock
                    </span>
                  </>
                ) : (
                  <>
                    <X size={14} className="text-muted-foreground" />
                    <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                      Out of Stock
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => orderViaWhatsApp(product, true)}
                className="flex-1 h-14 flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold uppercase tracking-widest text-sm transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L.057 23.273a.75.75 0 0 0 .92.92l5.421-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.36l-.355-.212-3.676.997.977-3.567-.232-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
                {product.inStock ? "Order via WhatsApp" : "Enquire via WhatsApp"}
              </button>
              <Link
                to="/contact"
                className="h-14 px-8 border border-border-subtle text-foreground font-mono-tech text-xs uppercase tracking-widest flex items-center justify-center hover:border-primary/60 hover:text-primary transition-colors"
              >
                Ask an Expert
              </Link>
            </div>

            {/* Shipping note */}
            <div className="font-mono-tech text-[10px] text-muted-foreground space-y-1 uppercase leading-relaxed">
              <p>[SHIP] Same-day dispatch on in-stock orders placed before 2PM.</p>
              <p>[WARRANTY] All items include manufacturer warranty — see our <Link to="/warranty" className="text-primary hover:underline">Warranty page</Link>.</p>
              <p>[RETURNS] 30-day hassle-free returns — see <Link to="/returns" className="text-primary hover:underline">Returns policy</Link>.</p>
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
                  Related {meta.title}
                </h2>
              </div>
              <Link
                to={`/${category}`}
                className="font-mono-tech text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest hidden sm:block"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
              {related.map((p) => (
                <div key={p.id} className="bg-background">
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
