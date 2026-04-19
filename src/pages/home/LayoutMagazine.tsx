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

const categories = [
  { id: "cameras", to: "/cameras", title: "Cameras & Cinema", tag: "PRO_IMAGING", image: heroCamera },
  { id: "microphones", to: "/microphones", title: "Microphones", tag: "ZERO_LATENCY", image: podcastMic },
  { id: "teleprompters", to: "/teleprompters", title: "Teleprompters", tag: "SCRIPT_FLOW", image: teleprompter },
  { id: "lighting", to: "/lighting", title: "Studio Lighting", tag: "HIGH_CRI", image: studioLight },
  { id: "lenses", to: "/lenses", title: "Lenses & Optics", tag: "OPTICAL_PRECISION", image: cineLens },
  { id: "support", to: "/support", title: "Support & Info", tag: "FIELD_READY", image: fieldMonitor },
];

export default function LayoutMagazine() {
  const { baseCurrency } = useCurrency();
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
            <img src={heroCamera} alt="hero" className="w-full h-full object-cover min-h-[50vh] lg:min-h-[85vh]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />
            <div className="absolute bottom-8 left-8">
              <span className="font-mono-tech text-[10px] text-primary tracking-widest bg-background/80 px-3 py-1.5">
                ISSUE_2026 / PREMIUM GEAR
              </span>
            </div>
          </div>

          {/* Right — editorial stack */}
          <div className="px-8 lg:px-12 py-12 flex flex-col justify-between border-l border-border-subtle">
            <div>
              <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
                The Creator's Source
              </p>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[0.85] tracking-tighter text-foreground mb-6">
                PROFESSIONAL
                <br />
                <span className="text-primary">MEDIA</span>
                <br />
                GEAR
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[40ch] mb-8">
                Every tool a filmmaker, podcaster, or creator needs — curated, tested, and ready to ship.
              </p>
              <a href="#categories" className="inline-flex items-center gap-4 h-14 px-8 bg-primary text-background font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-colors">
                Browse Catalogue →
              </a>
            </div>

            {/* Featured strip */}
            <div className="space-y-4 mt-12 border-t border-border-subtle pt-8">
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">Featured This Week</p>
              {featured.slice(0, 3).map((p) => (
                <Link key={p.id} to={`/${p.category}/${p.slug}`} className="flex items-center gap-4 group">
                  <div className="size-12 shrink-0 bg-grip overflow-hidden border border-border-subtle">
                    <img src={p.image_url} alt={p.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" />
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

      {/* Categories — horizontal editorial strip */}
      <section id="categories" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-2">DEPARTMENTS</p>
            <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
          </div>
          <span className="font-mono-tech text-xs text-muted-foreground hidden sm:block">2,400+ ITEMS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <Link key={cat.id} to={cat.to}
              className={`group relative overflow-hidden border border-border-subtle ${i === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}>
              <div className="aspect-[4/3] overflow-hidden">
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-chassis via-chassis/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-5">
                <span className="font-mono-tech text-[9px] text-primary tracking-widest block mb-1">{cat.tag}</span>
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
