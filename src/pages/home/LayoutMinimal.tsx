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
import Footer from "@/components/Footer";

const categories = [
  { id: "cameras", to: "/cameras", title: "Cameras & Cinema", image: heroCamera },
  { id: "microphones", to: "/microphones", title: "Microphones & Audio", image: podcastMic },
  { id: "teleprompters", to: "/teleprompters", title: "Teleprompters", image: teleprompter },
  { id: "lighting", to: "/lighting", title: "Studio Lighting", image: studioLight },
  { id: "lenses", to: "/lenses", title: "Lenses & Optics", image: cineLens },
  { id: "support", to: "/support", title: "Support & Info", image: fieldMonitor },
];

export default function LayoutMinimal() {
  const { baseCurrency } = useCurrency();
  const [featured, setFeatured] = useState<ApiProduct[]>([]);

  useEffect(() => {
    api.products.list(undefined, true).then(p => setFeatured(p.slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — centered minimal */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-24 lg:py-40 text-center">
        <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-6">Professional Media Equipment</p>
        <h1 className="text-6xl lg:text-9xl font-light tracking-tighter text-foreground mb-6 leading-none">
          Create<br /><span className="font-bold">Without Limits</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-[45ch] mx-auto mb-10 leading-relaxed">
          Cameras, lenses, audio, lighting, and teleprompters — everything the modern creator needs, in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="#categories" className="h-14 px-10 bg-foreground text-background font-bold uppercase tracking-widest text-sm flex items-center hover:bg-primary transition-colors">
            Shop Now
          </a>
          <Link to="/contact" className="h-14 px-10 border border-border-subtle text-foreground font-bold uppercase tracking-widest text-sm flex items-center hover:border-primary hover:text-primary transition-colors">
            Contact Us
          </Link>
        </div>
      </section>

      {/* Divider line */}
      <div className="border-t border-border-subtle" />

      {/* Stats row */}
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {[["50+", "Brands"], ["2,400+", "Products"], ["5★", "Rated"], ["Same-Day", "Shipping"]].map(([val, label]) => (
          <div key={label}>
            <p className="text-2xl font-bold text-foreground">{val}</p>
            <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-border-subtle" />

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-8 text-center">Featured Products</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {featured.map((p) => (
              <Link key={p.id} to={`/${p.category}/${p.slug}`} className="bg-background p-6 group hover:bg-grip/30 transition-colors">
                <div className="aspect-square bg-grip mb-4 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <p className="text-xs text-muted-foreground font-mono-tech mb-1">{p.brand}</p>
                <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-2">{p.name}</h3>
                <p className="text-primary font-bold text-sm">{formatCurrencySync(p.price, baseCurrency?.symbol || 'UGX', false)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories — 4-col clean grid */}
      <section id="categories" className="max-w-[1440px] mx-auto px-6 lg:px-8 pb-24">
        <div className="border-t border-border-subtle pt-16 mb-12">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-3 text-center">Shop by Category</p>
          <h2 className="text-3xl font-light tracking-tight text-center text-foreground">Browse All Departments</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={cat.to} className="group text-center">
              <div className="aspect-square bg-grip mb-3 overflow-hidden border border-border-subtle">
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
              </div>
              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{cat.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
