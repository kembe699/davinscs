import { useParams, Link, useNavigate } from "react-router-dom";
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
                  ${product.price.toLocaleString()}
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
                disabled={!product.inStock}
                className="flex-1 h-14 bg-foreground text-background font-bold uppercase tracking-widest text-sm hover:bg-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {product.inStock ? "Add to Cart" : "Notify Me"}
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
