import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarqueeBanner from "@/components/MarqueeBanner";
import AboutSection from "@/components/AboutSection";
import LayoutMagazine from "@/pages/home/LayoutMagazine";
import LayoutMinimal from "@/pages/home/LayoutMinimal";
import LayoutShowcase from "@/pages/home/LayoutShowcase";
import LayoutBold from "@/pages/home/LayoutBold";
import LayoutBoutique from "@/pages/home/LayoutBoutique";
import { useLayout } from "@/contexts/LayoutContext";
import StorefrontShop from "@/components/StorefrontShop";

const LayoutTechGrid = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <MarqueeBanner />
    <StorefrontShop />
    <AboutSection />
    <MarqueeBanner />
  </div>
);

const Index = () => {
  const { layout, loading } = useLayout();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  switch (layout) {
    case "magazine":   return <LayoutMagazine />;
    case "minimal":    return <LayoutMinimal />;
    case "showcase":   return <LayoutShowcase />;
    case "bold":       return <LayoutBold />;
    case "boutique":   return <LayoutBoutique />;
    default:           return <LayoutTechGrid />;
  }
};

export default Index;
