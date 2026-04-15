import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useState } from "react";
import type { Category, Product } from "@/data/products";
import { categoryMeta } from "@/data/products";

type Props = {
  category: Category;
  products: Product[];
};

const CategoryListingPage = ({ category, products }: Props) => {
  const meta = categoryMeta[category];
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc">("default");

  const filtered = products
    .filter((p) => selectedBrand === "ALL" || p.brand === selectedBrand)
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">
                  {meta.module}
                </span>
                <div className="w-8 h-px bg-primary/40" />
                <span className="font-mono-tech text-[10px] text-muted-foreground tracking-widest uppercase">
                  {meta.subtitle}
                </span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
                {meta.title.split(" ")[0]}{" "}
                <span className="text-primary font-bold">
                  {meta.title.split(" ").slice(1).join(" ")}
                </span>
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
                {meta.description}
              </p>
            </div>
            <div className="font-mono-tech text-[10px] text-muted-foreground text-right shrink-0">
              <div className="text-primary text-2xl font-bold">{filtered.length}</div>
              <div className="tracking-widest uppercase">Products Found</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="border-b border-border-subtle bg-grip/30">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mr-2">
              Brand:
            </span>
            {["ALL", ...brands].map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`font-mono-tech text-[10px] px-3 py-1 uppercase tracking-widest border transition-colors ${
                  selectedBrand === brand
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border-subtle text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mr-2">
              Sort:
            </span>
            {(
              [
                { value: "default", label: "Default" },
                { value: "price-asc", label: "Price ↑" },
                { value: "price-desc", label: "Price ↓" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`font-mono-tech text-[10px] px-3 py-1 uppercase tracking-widest border transition-colors ${
                  sortBy === opt.value
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border-subtle text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-mono-tech text-muted-foreground text-sm uppercase tracking-widest">
              No products match the selected filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {filtered.map((product) => (
              <div key={product.id} className="bg-background">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CategoryListingPage;
