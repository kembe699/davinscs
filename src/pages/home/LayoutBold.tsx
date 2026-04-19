import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiProduct } from "@/lib/api";
import { useCurrency } from "@/contexts/CurrencyContext";
import { formatCurrencySync } from "@/utils/currency";
import heroCamera from "@/assets/hero-camera.jpg";
import podcastMic from "@/assets/podcast-mic.jpg";
import teleprompter from "@/assets/teleprompter.jpg";
import studioLight from "@/assets/studio-light.jpg";
import cineLens from "@/assets/cine-lens.jpg";
import fieldMonitor from "@/assets/field-monitor.jpg";
import Navbar from "@/components/Navbar";
import MarqueeBanner from "@/components/MarqueeBanner";
import Footer from "@/components/Footer";

const cats = [
  { id:"cameras", to:"/cameras", title:"Cameras", num:"01", image:heroCamera },
  { id:"microphones", to:"/microphones", title:"Microphones", num:"02", image:podcastMic },
  { id:"teleprompters", to:"/teleprompters", title:"Teleprompters", num:"03", image:teleprompter },
  { id:"lighting", to:"/lighting", title:"Lighting", num:"04", image:studioLight },
  { id:"lenses", to:"/lenses", title:"Lenses", num:"05", image:cineLens },
  { id:"support", to:"/support", title:"Support", num:"06", image:fieldMonitor },
];

export default function LayoutBold() {
  const { baseCurrency } = useCurrency();
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
                <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-4">For Creators. By Creators.</p>
                <h1 className="text-7xl lg:text-9xl font-black tracking-tighter leading-none text-foreground mb-6">
                  THE<br />GEAR<br /><span className="text-primary">YOU</span><br />NEED
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-[36ch] mb-10">
                  50+ professional brands. 2,400+ products. Same-day shipping. Expert advice from working filmmakers.
                </p>
                <a href="#categories" className="inline-flex items-center gap-4 h-16 px-10 bg-primary text-background font-black uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                  SHOP NOW →
                </a>
              </div>
            </div>
          </div>

          {/* Right — stacked featured */}
          <div className="flex flex-col py-16 lg:py-24 lg:pl-16 gap-6">
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">Top Products</p>
            {featured.map((p, i) => (
              <Link key={p.id} to={`/${p.category}/${p.slug}`}
                className="flex gap-6 items-center group border-b border-border-subtle pb-6 last:border-b-0 last:pb-0">
                <span className="font-mono-tech text-4xl font-black text-border-subtle group-hover:text-primary transition-colors shrink-0">
                  {String(i+1).padStart(2,'0')}
                </span>
                <div className="size-20 shrink-0 bg-grip overflow-hidden border border-border-subtle">
                  <img src={p.image_url} alt={p.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* Categories — bold 2-col alternating */}
      <section id="categories" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="mb-12 flex items-end justify-between">
          <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground leading-none">
            SHOP<br /><span className="text-primary">GEAR</span>
          </h2>
          <span className="font-mono-tech text-xs text-muted-foreground hidden sm:block">2,400+ ITEMS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-subtle border border-border-subtle">
          {cats.map(cat => (
            <Link key={cat.id} to={cat.to} className="bg-chassis group relative overflow-hidden h-64 flex items-end hover:bg-grip transition-colors">
              <img src={cat.image} alt={cat.title} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700" />
              <div className="relative p-6 w-full">
                <span className="font-mono-tech text-4xl font-black text-primary/20 absolute top-4 right-4">{cat.num}</span>
                <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground group-hover:text-primary transition-colors">{cat.title}</h3>
                <p className="font-mono-tech text-xs text-muted-foreground mt-1">EXPLORE →</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <MarqueeBanner />
      <Footer />
    </div>
  );
}
