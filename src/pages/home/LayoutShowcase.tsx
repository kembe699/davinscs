import heroCamera from "@/assets/hero-camera.jpg";
import Navbar from "@/components/Navbar";
import MarqueeBanner from "@/components/MarqueeBanner";
import Footer from "@/components/Footer";
import StorefrontShop from "@/components/StorefrontShop";
import { Link } from "react-router-dom";

export default function LayoutShowcase() {

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
            <a href="#shop" className="h-14 px-10 bg-primary text-background font-bold uppercase tracking-widest text-sm flex items-center hover:bg-primary/90 transition-colors">Browse All Gear →</a>
            <Link to="/contact" className="h-14 px-8 border border-white/30 text-foreground font-bold uppercase tracking-widest text-sm flex items-center hover:border-primary hover:text-primary transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
      <MarqueeBanner />
      <StorefrontShop />
      <Footer />
    </div>
  );
}
