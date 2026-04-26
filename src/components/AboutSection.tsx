import { useLayout } from "@/contexts/LayoutContext";

const AboutSection = () => {
  const { storefrontSettings: sf } = useLayout();

  const tagline = sf.about_tagline || "About Davin's";
  const heading = sf.about_heading || "Built for the modern creator";
  const body =
    sf.about_body ||
    "We don't just sell equipment — we help creators build reliable, professional setups that work in the real world.";
  const stat1Value = sf.about_stat_1_value || "7+";
  const stat1Label = sf.about_stat_1_label || "Years";
  const stat2Value = sf.about_stat_2_value || "12K+";
  const stat2Label = sf.about_stat_2_label || "Customers";
  const stat3Value = sf.about_stat_3_value || "4.9★";
  const stat3Label = sf.about_stat_3_label || "Rating";

  return (
    <section id="about" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <div className="space-y-8">
          <div className="font-mono-tech text-xs text-primary tracking-[0.4em] uppercase">
            {tagline}
          </div>
          <h2 className="text-3xl lg:text-4xl font-light leading-tight tracking-tight text-foreground max-w-md">
            {heading}
          </h2>
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed max-w-md">
            {body}
          </p>
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border-subtle">
            <div>
              <p className="text-2xl font-bold text-primary">{stat1Value}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{stat1Label}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stat2Value}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{stat2Label}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stat3Value}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{stat3Label}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="bg-grip aspect-square overflow-hidden border border-border-subtle">
            <img
              src={sf.about_image || "/placeholder.svg"}
              loading="lazy"
              width={800}
              height={800}
              className="w-full h-full object-cover opacity-80"
              alt="Professional podcast microphone setup"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 lg:-bottom-8 lg:-left-8 bg-primary p-6 lg:p-8 flex flex-col justify-end">
            <span className="text-3xl lg:text-4xl font-bold text-primary-foreground">24/7</span>
            <span className="font-mono-tech text-xs text-primary-foreground/80 uppercase tracking-tighter">
              Expert Support
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
