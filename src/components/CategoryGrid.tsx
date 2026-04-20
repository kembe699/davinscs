import { useEffect, useState } from "react";
import { api, ApiCategory } from "@/lib/api";

const CategoryGrid = () => {
  const [categories, setCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const handleClick = (slug: string) => {
    const el = document.getElementById("shop");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      const event = new CustomEvent("storefront:category", { detail: slug });
      window.dispatchEvent(event);
    }
  };

  if (categories.length === 0) return null;

  return (
    <section id="categories" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-12 lg:mb-16 gap-4">
        <div>
          <h2 className="font-mono-tech text-xs text-primary tracking-[0.4em] uppercase mb-4">
            Department Select
          </h2>
          <p className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
            Shop by Category
          </p>
        </div>
        <div className="font-mono-tech text-sm text-muted-foreground">
          TOTAL_ITEMS: {categories.length} CATEGORIES
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-subtle border border-border-subtle">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => handleClick(cat.slug)}
            className="bg-chassis p-6 lg:p-8 group hover:bg-grip transition-colors text-left"
          >
            <div className="aspect-square bg-grip mb-6 lg:mb-8 relative overflow-hidden">
              {cat.image_url ? (
                <img
                  src={cat.image_url || "/placeholder.svg"}
                  alt={cat.name}
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-mono-tech text-4xl text-primary/20 font-black">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              )}
              <div className="absolute top-4 left-4">
                <span className="font-mono-tech text-[10px] bg-chassis/80 px-2 py-1 text-foreground">
                  MODULE_{String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors text-foreground">
              {cat.name}
            </h3>
            <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
              <span className="font-mono-tech text-xs text-primary tracking-tighter uppercase">{cat.slug}</span>
              <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
