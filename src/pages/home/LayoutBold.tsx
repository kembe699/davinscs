import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import Navbar from "@/components/Navbar";
import { useLayout } from "@/contexts/LayoutContext";
import MarqueeBanner from "@/components/MarqueeBanner";
import StorefrontShop from "@/components/StorefrontShop";

export default function LayoutBold() {
  const { baseCurrency } = useCurrency();
  const { storefrontSettings: sf } = useLayout();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);
  useEffect(() => { api.products.list(undefined, true).then(p => setFeatured(p.slice(0,3))).catch(()=>{}); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — oversized type + split */}
      <section className="border-b border-border-subtle overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 min-h-[80vh]">
          {/* Left — giant type */}
          <div className="flex flex-col justify-center py-16 lg:py-24 pr-0 lg:pr-16 border-b lg:border-b-0 lg:border-r border-border-subtle">
            <div className="relative">
              <span className="absolute -top-4 -left-2 font-mono-tech text-[120px] lg:text-[200px] font-black text-primary/5 leading-none select-none pointer-events-none">PRO</span>
              <div className="relative">
                {sf.hero_tagline && <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-4">{sf.hero_tagline}</p>}
                <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-none text-foreground mb-6">
                  {sf.hero_heading_1 && <>{sf.hero_heading_1}<br /></>}
                  {sf.hero_heading_2 && <span className="text-primary">{sf.hero_heading_2}</span>}
                </h1>
                {sf.hero_subtext && (
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-[36ch] mb-10">{sf.hero_subtext}</p>
                )}
                <a href="#shop" className="inline-flex items-center gap-4 h-16 px-10 bg-primary text-background font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                  SHOP NOW →
                </a>
              </div>
            </div>
          </div>

          {/* Right — stacked featured */}
          <div className="flex flex-col py-16 lg:py-24 lg:pl-16 gap-6">
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">Top Products</p>
            {featured.map((p, i) => (
              <Link key={p.id} to={`/product/${p.slug}`}
                className="flex gap-6 items-center group border-b border-border-subtle pb-6 last:border-b-0 last:pb-0">
                <span className="font-mono-tech text-4xl font-black text-border-subtle group-hover:text-primary transition-colors shrink-0">
                  {String(i+1).padStart(2,'0')}
                </span>
                <div className="size-20 shrink-0 bg-grip overflow-hidden border border-border-subtle">
                  <img src={p.image_url || "/placeholder.svg"} alt={p.name} onError={(e)=>{(e.currentTarget as HTMLImageElement).src="/placeholder.svg";}} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">{p.name}</h3>
                  <p className="font-mono-tech text-[10px] text-muted-foreground mt-1">{p.brand}</p>
                  <p className="text-primary font-bold text-sm mt-1">{formatCurrencySync(p.price, baseCurrency?.symbol||'UGX', false)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <MarqueeBanner />
      <StorefrontShop />
    </div>
  );
}
