import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import Navbar from "@/components/Navbar";
import { useLayout } from "@/contexts/LayoutContext";
import MarqueeBanner from "@/components/MarqueeBanner";
import StorefrontShop from "@/components/StorefrontShop";

export default function LayoutMagazine() {
  const { baseCurrency } = useCurrency();
  const { storefrontSettings: sf } = useLayout();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);

  useEffect(() => {
    api.products.list(undefined, true).then(p => setFeatured(p.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — editorial split */}
      <section className="relative border-b border-border-subtle overflow-hidden">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 min-h-[85vh]">
          {/* Left — big image */}
          <div className="relative overflow-hidden">
            <img src={sf.hero_image || "/placeholder.svg"} alt="hero" className="w-full h-full object-cover min-h-[50vh] lg:min-h-[85vh]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />
            {sf.hero_badge_3 && (
              <div className="absolute bottom-8 left-8">
                <span className="font-mono-tech text-[10px] text-primary tracking-widest bg-background/80 px-3 py-1.5">
                  {sf.hero_badge_3}
                </span>
              </div>
            )}
          </div>

          {/* Right — editorial stack */}
          <div className="px-8 lg:px-12 py-12 flex flex-col justify-between border-l border-border-subtle">
            <div>
              {sf.hero_tagline && (
                <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
                  {sf.hero_tagline}
                </p>
              )}
              <h1 className="text-5xl lg:text-7xl font-bold leading-[0.85] tracking-tighter text-foreground mb-6">
                {sf.hero_heading_1 || ""}
                {sf.hero_heading_2 && (
                  <><br /><span className="text-primary">{sf.hero_heading_2}</span></>
                )}
              </h1>
              {sf.hero_subtext && (
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[40ch] mb-8">
                  {sf.hero_subtext}
                </p>
              )}
              <a href="#shop" className="inline-flex items-center gap-4 h-14 px-8 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                Browse Catalogue →
              </a>
            </div>

            {/* Featured strip */}
            <div className="space-y-4 mt-12 border-t border-border-subtle pt-8">
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Featured This Week</p>
              {featured.slice(0, 3).map((p) => (
                <Link key={p.id} to={`/product/${p.slug}`} className="flex items-center gap-4 group">
                  <div className="size-12 shrink-0 bg-grip overflow-hidden border border-border-subtle">
                    <img src={p.image_url || "/placeholder.svg"} alt={p.name} onError={(e)=>{(e.currentTarget as HTMLImageElement).src="/placeholder.svg";}} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="font-mono-tech text-[10px] text-muted-foreground">{p.brand}</p>
                  </div>
                  <p className="font-mono-tech text-xs text-primary shrink-0">{formatCurrencySync(p.price, baseCurrency?.symbol || 'UGX', false)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <MarqueeBanner />
      <StorefrontShop />
    </div>
  );
}
