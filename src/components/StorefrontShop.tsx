import { useState, useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiProduct, ApiCategory } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { orderViaWhatsApp } from "@/utils/whatsapp";
import { useTenantPath } from "@/contexts/TenantContext";
import { useTranslation } from "react-i18next";
import { useLayout } from "@/contexts/LayoutContext";

type SortOption = "default" | "price-asc" | "price-desc" | "name";

interface Props {
  initialCategory?: string;
}

export default function StorefrontShop({ initialCategory }: Props) {
  const { baseCurrency } = useCurrency();
  const tp = useTenantPath();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts]     = useState<ApiProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory || "all");
  const [activeBrand, setActiveBrand]       = useState<string>("all");
  const [sort, setSort]                     = useState<SortOption>("default");
  const [showFilters, setShowFilters]       = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search).get("q");
    if (query) {
      setSearch(query);
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [location.search]);

  useEffect(() => {
    Promise.all([api.categories.list(), api.products.list()])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialCategory) setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      if (slug) setActiveCategory(slug);
    };
    window.addEventListener("storefront:category", handler);
    return () => window.removeEventListener("storefront:category", handler);
  }, []);

  const handleCategoryClick = (slug: string) => {
    setActiveCategory(slug);
    setActiveBrand("all");
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filteredProducts = products
    .filter(p => activeCategory === "all" || p.category === activeCategory)
    .filter(p => activeBrand === "all" || p.brand === activeBrand)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "price-asc")  return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name")       return a.name.localeCompare(b.name);
      return 0;
    });

  const brands = Array.from(
    new Set(
      products
        .filter(p => activeCategory === "all" || p.category === activeCategory)
        .map(p => p.brand)
    )
  ).sort();

  return (
    <section ref={sectionRef} id="shop" className="border-t border-border-subtle">
      {/* ── Search hero bar ────────────────────────────── */}
      <div className="bg-chassis border-b border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-3">
            {t('storefront.shop.searchBtn')}
          </p>
          <div className="relative max-w-2xl">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('storefront.shop.searchPlaceholder')}
              className="w-full h-14 pl-11 pr-10 bg-admin-bg border border-border-subtle text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {search && (
            <p className="font-mono-tech text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
              {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""} for &quot;{search}&quot;
            </p>
          )}
        </div>
      </div>

      {/* ── Category tabs ──────────────────────────────── */}
      <div className="bg-chassis border-b border-border-subtle overflow-x-auto">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-0 min-w-max">
            <button
              onClick={() => handleCategoryClick("all")}
              className={`px-5 py-4 font-mono-tech text-[10px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeCategory === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t('storefront.shop.allProducts')}
              <span className="ml-2 text-[9px] opacity-60">({products.length})</span>
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.category === cat.slug).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`px-5 py-4 font-mono-tech text-[10px] uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                    activeCategory === cat.slug
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                  <span className="ml-2 text-[9px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filter / sort bar ──────────────────────────── */}
      <div className="bg-grip/20 border-b border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                showFilters
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border-subtle text-muted-foreground hover:border-primary/40"
              }`}
            >
              <SlidersHorizontal size={11} />
              {t('storefront.shop.filters')}
            </button>
            {(activeBrand !== "all" || sort !== "default") && (
              <button
                onClick={() => { setActiveBrand("all"); setSort("default"); }}
                className="font-mono-tech text-[10px] text-muted-foreground hover:text-primary uppercase tracking-widest"
              >
                Clear ×
              </button>
            )}
          </div>
          <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {showFilters && (
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pb-4 flex flex-col sm:flex-row gap-6">
            {/* Brand filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">Brand:</span>
              {["all", ...brands].map(b => (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`font-mono-tech text-[10px] px-2.5 py-1 uppercase tracking-widest border transition-colors ${
                    activeBrand === b
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border-subtle text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {b === "all" ? "All" : b}
                </button>
              ))}
            </div>
            {/* Sort */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">Sort:</span>
              {([
                { value: "default", label: "Default" },
                { value: "price-asc", label: "Price ↑" },
                { value: "price-desc", label: "Price ↓" },
                { value: "name", label: "A→Z" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`font-mono-tech text-[10px] px-2.5 py-1 uppercase tracking-widest border transition-colors ${
                    sort === opt.value
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border-subtle text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Product grid ───────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-10 lg:py-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-background aspect-[3/4] animate-pulse bg-grip/40" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24">
            <Search size={32} className="mx-auto text-muted-foreground mb-4 opacity-40" />
            <p className="font-mono-tech text-sm text-muted-foreground uppercase tracking-widest">
              No products found
            </p>
            <button
              onClick={() => { setSearch(""); setActiveCategory("all"); setActiveBrand("all"); }}
              className="mt-4 font-mono-tech text-[10px] text-primary uppercase tracking-widest hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-background">
                <ShopProductCard product={product} sym={baseCurrency?.symbol || "SSP"} productPath={tp(`/product/${product.slug}`)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Inline product card (no external navigation for 404s) ── */
function ShopProductCard({ product, sym, productPath }: { product: ApiProduct; sym: string; productPath: string }) {
  const { t } = useTranslation();
  const { company } = useLayout();
  return (
    <Link
      to={productPath}
      className="bg-chassis border border-border-subtle group flex flex-col hover:border-primary/40 transition-colors h-full"
    >
      <div className="aspect-square bg-grip relative overflow-hidden">
        <img
          src={product.image_url || "/placeholder.svg"}
          alt={product.name}
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
        />
        {!product.in_stock && (
          <div className="absolute inset-0 bg-chassis/70 flex items-center justify-center">
            <span className="font-mono-tech text-[10px] text-muted-foreground tracking-widest uppercase border border-border-subtle px-3 py-1">
              Out of Stock
            </span>
          </div>
        )}
        {product.is_featured && (
          <div className="absolute top-2 left-2">
            <span className="font-mono-tech text-[9px] bg-primary text-background px-2 py-0.5 tracking-widest uppercase">
              Featured
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="font-mono-tech text-[10px] text-muted-foreground tracking-widest uppercase mb-1">
          {product.brand}
        </span>
        <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors mb-3 flex-1 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle mt-auto">
          <span className="text-primary font-mono-tech text-sm font-bold">
            {formatCurrencySync(product.price, sym, false)}
          </span>
          {!!company?.whatsapp && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                orderViaWhatsApp(product, {
                  whatsapp: company.whatsapp,
                  companyName: company.name,
                  currencySymbol: sym,
                });
              }}
              title="Order via WhatsApp"
              className="flex items-center gap-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[9px] font-mono-tech uppercase tracking-widest px-2 py-1.5 transition-colors shrink-0"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L.057 23.273a.75.75 0 0 0 .92.92l5.421-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.36l-.355-.212-3.676.997.977-3.567-.232-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
              {t('storefront.shop.order')}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
