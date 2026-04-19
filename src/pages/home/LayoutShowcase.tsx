import { useEffect, useState, useRef } from "react";
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
  { id:"cameras", to:"/cameras", title:"Cameras & Cinema", image:heroCamera },
  { id:"microphones", to:"/microphones", title:"Microphones", image:podcastMic },
  { id:"teleprompters", to:"/teleprompters", title:"Teleprompters", image:teleprompter },
  { id:"lighting", to:"/lighting", title:"Studio Lighting", image:studioLight },
  { id:"lenses", to:"/lenses", title:"Lenses & Optics", image:cineLens },
  { id:"support", to:"/support", title:"Support & Info", image:fieldMonitor },
];

export default function LayoutShowcase() {
  const { baseCurrency } = useCurrency();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { api.products.list(undefined, true).then(p => setFeatured(p.slice(0,8))).catch(()=>{}); }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Cinematic full-width hero */}
      <section className="relative overflow-hidden" style={{height:"90vh"}}>
        <img src={heroCamera} alt="hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/20 to-background" />
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="relative h-full flex flex-col justify-end max-w-[1440px] mx-auto px-6 lg:px-8 pb-20">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-4">Professional Media Equipment</p>
          <h1 className="text-6xl lg:text-8xl font-bold tracking-tighter text-foreground leading-none mb-6">
            SHOOT.<br /><span className="text-primary">CREATE.</span><br />DELIVER.
          </h1>
          <div className="flex gap-4 flex-wrap">
            <a href="#categories" className="h-14 px-10 bg-primary text-background font-bold uppercase tracking-widest text-sm flex items-center hover:bg-primary/90 transition-colors">Browse All Gear →</a>
            <Link to="/contact" className="h-14 px-8 border border-white/30 text-foreground font-bold uppercase tracking-widest text-sm flex items-center hover:border-primary hover:text-primary transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
      <MarqueeBanner />
      {/* Horizontal scroll products */}
      {featured.length > 0 && (
        <section className="py-16 border-b border-border-subtle overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-8 mb-8 flex justify-between items-end">
            <div>
              <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-2">Featured Gear</p>
              <h2 className="text-2xl font-bold tracking-tight">Editor's Picks</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => scrollRef.current?.scrollBy({left:-320,behavior:"smooth"})} className="size-10 border border-border-subtle flex items-center justify-center hover:border-primary hover:text-primary transition-colors">←</button>
              <button onClick={() => scrollRef.current?.scrollBy({left:320,behavior:"smooth"})} className="size-10 border border-border-subtle flex items-center justify-center hover:border-primary hover:text-primary transition-colors">→</button>
            </div>
          </div>
          <div ref={scrollRef} className="flex gap-4 px-6 lg:px-8 overflow-x-auto scroll-smooth pb-4" style={{scrollbarWidth:"none"}}>
            {featured.map(p => (
              <Link key={p.id} to={`/${p.category}/${p.slug}`} className="flex-none w-64 border border-border-subtle group hover:border-primary/50 transition-colors bg-chassis">
                <div className="aspect-square overflow-hidden bg-grip">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4">
                  <p className="font-mono-tech text-[9px] text-muted-foreground uppercase mb-1">{p.brand}</p>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-2 line-clamp-2">{p.name}</h3>
                  <p className="text-primary font-bold">{formatCurrencySync(p.price, baseCurrency?.symbol||'UGX', false)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* Category showcase cards */}
      <section id="categories" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-3">Departments</p>
        <h2 className="text-4xl font-bold tracking-tight mb-10">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cats.map(cat => (
            <Link key={cat.id} to={cat.to} className="group relative overflow-hidden border border-border-subtle h-56 flex items-end">
              <img src={cat.image} alt={cat.title} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-chassis/90 to-transparent" />
              <div className="relative p-5">
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{cat.title}</h3>
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
