import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import { useLayout } from "@/contexts/LayoutContext";

const HeroSection = () => {
  const { baseCurrency } = useCurrency();
  const { storefrontSettings: sf, companyName } = useLayout();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);

  const tagline = sf.hero_tagline || "Your Vision / Our Gear";
  const heading1 = sf.hero_heading_1 || "CAPTURE";
  const heading2 = sf.hero_heading_2 || "EVERYTHING";
  const subtext =
    sf.hero_subtext ||
    "Professional cameras, audio, and production gear — curated for creators who need reliability.";
  const brandsCount = sf.hero_brands_count || "50+";
  const productsCount = sf.hero_products_count || "2,400+";

  const badge1 = sf.hero_badge_1 || "[AUTH] Authorized dealer for Sony, Canon, Rode.";
  const badge2 = sf.hero_badge_2 || "[SHIP] Same-day dispatch on in-stock items.";
  const badge3 = sf.hero_badge_3 || "[SUPPORT] Expert advice from working creators.";

  useEffect(() => {
    api.products.list(undefined, true)
      .then((products) => setFeatured(products.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 technical-grid opacity-20 pointer-events-none" />
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 pt-12 lg:pt-16 pb-20 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative">
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col justify-end gap-8 lg:gap-12 animate-fade-up">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2 py-1 border border-primary/30 bg-primary/5">
              <span className="font-mono-tech text-[10px] text-primary font-bold uppercase tracking-widest">
                {tagline}
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-light leading-[0.9] tracking-tighter text-foreground">
              {heading1}{" "}
              <br />
              <span className="font-bold text-primary">{heading2}</span>
            </h1>
            <p className="text-muted-foreground max-w-[30ch] text-sm leading-relaxed">
              {subtext}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-8">
            <div className="space-y-1">
              <span className="font-mono-tech text-[9px] uppercase text-muted-foreground">Brands</span>
              <p className="text-lg font-mono-tech font-medium text-foreground">{brandsCount}</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono-tech text-[9px] uppercase text-muted-foreground">Products</span>
              <p className="text-lg font-mono-tech font-medium text-foreground">{productsCount}</p>
            </div>
          </div>

          <a
            href="#shop"
            className="group relative w-full h-14 bg-foreground text-background font-bold uppercase tracking-widest text-sm flex items-center justify-center overflow-hidden transition-all hover:bg-primary"
          >
            <span className="relative z-10">Browse Equipment</span>
          </a>
        </div>

        {/* Center Column - Main Image */}
        <div className="lg:col-span-5 relative animate-fade-up animate-fade-up-delay-1">
          <div className="aspect-[4/5] bg-grip border border-border-subtle relative overflow-hidden group">
            <div className="absolute top-4 left-4 size-8 border-t border-l border-primary/40 z-10" />
            <div className="absolute top-4 right-4 size-8 border-t border-r border-primary/40 z-10" />
            <div className="absolute bottom-4 left-4 size-8 border-b border-l border-primary/40 z-10" />
            <div className="absolute bottom-4 right-4 size-8 border-b border-r border-primary/40 z-10" />
            <img
              src={sf.hero_image || "/placeholder.svg"}
              alt="Professional cinema camera with orange accents"
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
              width={1000}
              height={1250}
            />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-chassis to-transparent">
              <div className="flex justify-between items-end">
                <div className="font-mono-tech text-[10px] text-muted-foreground">
                  {companyName || ""}
                </div>
                <div className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="font-mono-tech text-xs text-foreground uppercase tracking-tighter">
                    IN STOCK
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Featured Items */}
        <div className="lg:col-span-3 flex flex-col gap-6 animate-fade-up animate-fade-up-delay-2">
          <div className="p-6 border border-border-subtle bg-grip/50">
            <span className="font-mono-tech text-[10px] text-primary block mb-4 tracking-widest">
              FEATURED GEAR
            </span>
            {featured.length === 0 ? (
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                No featured products yet.
              </p>
            ) : (
              <div className="space-y-6">
                {featured.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.slug}`}
                    className="flex gap-4 items-start group"
                  >
                    <div className="size-16 shrink-0 bg-chassis border border-border-subtle overflow-hidden">
                      <img
                        src={p.image_url || "/placeholder.svg"}
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                        className="size-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={p.name}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                        {p.name}
                      </h4>
                      <p className="font-mono-tech text-[10px] text-muted-foreground">{p.brand}</p>
                      <p className="mt-1 text-xs text-primary">{formatCurrencySync(p.price, baseCurrency?.symbol || 'UGX', false)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 border-l border-border-subtle pl-6 flex flex-col justify-end">
            <div className="font-mono-tech text-[10px] text-muted-foreground space-y-2 uppercase leading-relaxed">
              <p>{badge1}</p>
              <p>{badge2}</p>
              <p>{badge3}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
