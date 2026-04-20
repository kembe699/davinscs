import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import heroCamera from "@/assets/hero-camera.jpg";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StorefrontShop from "@/components/StorefrontShop";

export default function LayoutBoutique() {
  const { baseCurrency } = useCurrency();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);
  useEffect(() => { api.products.list(undefined, true).then(p => setFeatured(p.slice(0,6))).catch(()=>{}); }, []);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="flex items-center gap-3 mb-8"><div className="h-px w-10 bg-primary" /><p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase">Curated for Professionals</p></div>
          <h1 className="text-5xl lg:text-7xl font-light tracking-tight text-foreground leading-[1.05] mb-8">Where Vision<br />Meets <span className="italic font-semibold">Precision</span></h1>
          <p className="text-muted-foreground leading-relaxed max-w-[42ch] mb-10">Professional media equipment for filmmakers, broadcasters, and creators who demand the best.</p>
          <div className="flex items-center gap-6">
            <a href="#shop" className="h-14 px-10 bg-foreground text-background font-semibold uppercase tracking-widest text-sm flex items-center hover:bg-primary transition-colors">Explore Collection</a>
            <Link to="/contact" className="text-sm font-semibold hover:text-primary transition-colors uppercase tracking-widest">Contact →</Link>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[4/5] overflow-hidden border border-border-subtle"><img src={heroCamera} alt="hero" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" /></div>
          <div className="absolute -bottom-6 -left-6 bg-background border border-border-subtle p-5 hidden lg:block">
            <p className="font-mono-tech text-[9px] text-primary tracking-widest uppercase mb-1">Est. 2018</p>
            <p className="text-sm font-semibold">Trusted by 10,000+ creators</p>
          </div>
        </div>
      </section>
      <div className="border-t border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[["50+","Brands"],["2,400+","Products"],["5 ★","Rating"],["Same Day","Shipping"]].map(([v,l]) => (
            <div key={l}><p className="text-2xl font-semibold mb-1">{v}</p><p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest">{l}</p></div>
          ))}
        </div>
      </div>
      {featured.length > 0 && (
        <section className="border-t border-border-subtle bg-chassis">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
            <h2 className="text-3xl font-light tracking-tight text-center mb-12">Featured Collection</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {featured.map(p => (
                <Link key={p.id} to={`/product/${p.slug}`} className="group">
                  <div className="aspect-[3/4] bg-grip overflow-hidden mb-4 border border-border-subtle"><img src={p.image_url || "/placeholder.svg"} alt={p.name} onError={(e)=>{(e.currentTarget as HTMLImageElement).src="/placeholder.svg";}} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" /></div>
                  <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{p.brand}</p>
                  <h3 className="text-sm font-semibold group-hover:text-primary transition-colors mb-2 leading-snug">{p.name}</h3>
                  <p className="text-primary font-semibold">{formatCurrencySync(p.price, baseCurrency?.symbol||'UGX', false)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <StorefrontShop />
      <Footer />
    </div>
  );
}
