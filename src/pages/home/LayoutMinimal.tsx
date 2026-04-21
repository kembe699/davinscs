import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StorefrontShop from "@/components/StorefrontShop";
import { useLayout } from "@/contexts/LayoutContext";

export default function LayoutMinimal() {
  const { storefrontSettings: sf } = useLayout();

  const stats: [string, string][] = [
    ...(sf.hero_brands_count ? [[sf.hero_brands_count, "Brands"] as [string, string]] : []),
    ...(sf.hero_products_count ? [[sf.hero_products_count, "Products"] as [string, string]] : []),
    ...(sf.about_stat_3_value ? [[sf.about_stat_3_value, sf.about_stat_3_label || "Rating"] as [string, string]] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO — centered minimal */}
      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-24 lg:py-40 text-center">
        {sf.hero_tagline && <p className="font-mono-tech text-[10px] text-primary tracking-[0.5em] uppercase mb-6">{sf.hero_tagline}</p>}
        <h1 className="text-6xl lg:text-9xl font-light tracking-tighter text-foreground mb-6 leading-none">
          {sf.hero_heading_1 || ""}<br /><span className="font-bold">{sf.hero_heading_2 || ""}</span>
        </h1>
        {sf.hero_subtext && (
          <p className="text-muted-foreground text-base max-w-[45ch] mx-auto mb-10 leading-relaxed">
            {sf.hero_subtext}
          </p>
        )}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="#shop" className="h-14 px-10 bg-foreground text-background font-bold uppercase tracking-widest text-sm flex items-center hover:bg-primary transition-colors">
            Shop Now
          </a>
          <Link to="/contact" className="h-14 px-10 border border-border-subtle text-foreground font-bold uppercase tracking-widest text-sm flex items-center hover:border-primary hover:text-primary transition-colors">
            Contact Us
          </Link>
        </div>
      </section>

      {/* Divider line */}
      <div className="border-t border-border-subtle" />

      {/* Stats row — only shown when data is configured */}
      {stats.length > 0 && (
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map(([val, label]) => (
            <div key={val}>
              <p className="text-2xl font-bold text-foreground">{val}</p>
              {label && <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{label}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border-subtle" />

      <StorefrontShop />
      <Footer />
    </div>
  );
}
