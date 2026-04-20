import podcastMic from "@/assets/podcast-mic.jpg";
import { useLayout } from "@/contexts/LayoutContext";

const AboutSection = () => {
  const { storefrontSettings: sf } = useLayout();

  return (
    <section id="about" className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <div className="space-y-8">
          <div className="font-mono-tech text-xs text-primary tracking-[0.4em] uppercase">
            {sf.about_tagline || "About Davin's"}
          </div>
          <h2 className="text-3xl lg:text-4xl font-light leading-tight tracking-tight text-foreground max-w-md">
            {sf.about_heading || "Built for the creator who demands more."}
          </h2>
          <p className="text-muted-foreground text-base lg:text-lg leading-relaxed max-w-md">
            {sf.about_body || "We don't just sell equipment. We curate the tools that bridge your creative vision and professional output. Every product at Davin's is hand-selected by working filmmakers, podcasters, and content creators."}
          </p>
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border-subtle">
            <div>
              <p className="text-2xl font-bold text-primary">{sf.about_stat_1_value || "7+"}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{sf.about_stat_1_label || "Years"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{sf.about_stat_2_value || "12K+"}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{sf.about_stat_2_label || "Customers"}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{sf.about_stat_3_value || "4.9★"}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase">{sf.about_stat_3_label || "Rating"}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="bg-grip aspect-square overflow-hidden border border-border-subtle">
            <img
              src={sf.about_image || podcastMic}
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
