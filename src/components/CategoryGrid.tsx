import heroCamera from "@/assets/hero-camera.jpg";
import podcastMic from "@/assets/podcast-mic.jpg";
import teleprompter from "@/assets/teleprompter.jpg";
import studioLight from "@/assets/studio-light.jpg";
import cineLens from "@/assets/cine-lens.jpg";
import fieldMonitor from "@/assets/field-monitor.jpg";

const categories = [
  {
    id: "cameras",
    module: "MODULE_01",
    title: "Cameras & Cinema",
    description: "From mirrorless hybrids to full-frame cinema rigs. 4K, 6K, 8K — every resolution covered.",
    tag: "PRO_IMAGING",
    image: heroCamera,
  },
  {
    id: "audio",
    module: "MODULE_02",
    title: "Microphones & Audio",
    description: "XLR condensers, wireless lavs, shotgun mics, and podcast-ready bundles.",
    tag: "ZERO_LATENCY",
    image: podcastMic,
  },
  {
    id: "studio",
    module: "MODULE_03",
    title: "Teleprompters",
    description: "Professional teleprompter systems for live broadcasts, YouTube, and corporate productions.",
    tag: "SCRIPT_FLOW",
    image: teleprompter,
  },
  {
    id: "lighting",
    module: "MODULE_04",
    title: "Studio Lighting",
    description: "LED panels, COB lights, ring lights, softboxes, and full studio kits.",
    tag: "HIGH_CRI",
    image: studioLight,
  },
  {
    id: "lenses",
    module: "MODULE_05",
    title: "Lenses & Optics",
    description: "Cine primes, anamorphic glass, zoom lenses, and vintage rehoused optics.",
    tag: "OPTICAL_PRECISION",
    image: cineLens,
  },
  {
    id: "monitors",
    module: "MODULE_06",
    title: "Monitors & Accessories",
    description: "Field monitors, cages, rigs, follow focus systems, and stabilizers.",
    tag: "FIELD_READY",
    image: fieldMonitor,
  },
];

const CategoryGrid = () => {
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
          TOTAL_ITEMS: 2,400+
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border-subtle border border-border-subtle">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-chassis p-6 lg:p-8 group cursor-pointer hover:bg-grip transition-colors"
          >
            <div className="aspect-square bg-grip mb-6 lg:mb-8 relative overflow-hidden">
              <img
                src={cat.image}
                alt={cat.title}
                loading="lazy"
                width={600}
                height={600}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
              />
              <div className="absolute top-4 left-4">
                <span className="font-mono-tech text-[10px] bg-chassis/80 px-2 py-1 text-foreground">
                  {cat.module}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors text-foreground">
              {cat.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 lg:mb-8">
              {cat.description}
            </p>
            <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
              <span className="font-mono-tech text-xs text-primary tracking-tighter">{cat.tag}</span>
              <span className="text-muted-foreground group-hover:text-primary transition-colors">→</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
