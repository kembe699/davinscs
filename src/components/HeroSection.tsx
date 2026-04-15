import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroCamera from "@/assets/hero-camera.jpg";
import { api, ApiProduct } from "@/lib/api";

const HeroSection = () => {
  const [featured, setFeatured] = useState<ApiProduct[]>([]);

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
                Your Vision / Our Gear
              </span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-light leading-[0.9] tracking-tighter text-foreground">
              CAPTURE{" "}
              <br />
              <span className="font-bold text-primary">EVERYTHING</span>
            </h1>
            <p className="text-muted-foreground max-w-[30ch] text-sm leading-relaxed">
              Professional cameras, podcast setups, teleprompters, microphones, and studio lighting — all under one roof.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border-subtle pt-8">
            <div className="space-y-1">
              <span className="font-mono-tech text-[9px] uppercase text-muted-foreground">Brands</span>
              <p className="text-lg font-mono-tech font-medium text-foreground">50+</p>
            </div>
            <div className="space-y-1">
              <span className="font-mono-tech text-[9px] uppercase text-muted-foreground">Products</span>
              <p className="text-lg font-mono-tech font-medium text-foreground">2,400+</p>
            </div>
          </div>

          <a
            href="#categories"
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
              src={heroCamera}
              alt="Professional cinema camera with orange accents"
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
              width={1000}
              height={1250}
            />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-chassis to-transparent">
              <div className="flex justify-between items-end">
                <div className="font-mono-tech text-[10px] text-muted-foreground">
                  DAVIN'S CAMERA STORE
                  <br />
                  EST. 2018
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
                    to={`/${p.category}/${p.slug}`}
                    className="flex gap-4 items-start group"
                  >
                    <div className="size-16 shrink-0 bg-chassis border border-border-subtle overflow-hidden">
                      <img
                        src={p.image_url}
                        loading="lazy"
                        className="size-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={p.name}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                        {p.name}
                      </h4>
                      <p className="font-mono-tech text-[10px] text-muted-foreground">{p.brand}</p>
                      <p className="mt-1 text-xs text-primary">UGX {p.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 border-l border-border-subtle pl-6 flex flex-col justify-end">
            <div className="font-mono-tech text-[10px] text-muted-foreground space-y-2 uppercase leading-relaxed">
              <p>[AUTH] Authorized dealer for Sony, Canon, Blackmagic, Røde &amp; more.</p>
              <p>[SHIP] Same-day shipping on in-stock items.</p>
              <p>[SUPPORT] Expert advice from working professionals.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
