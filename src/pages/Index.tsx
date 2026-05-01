import Navbar from "@/components/Navbar";
import LayoutMagazine from "@/pages/home/LayoutMagazine";
import LayoutMinimal from "@/pages/home/LayoutMinimal";
import LayoutShowcase from "@/pages/home/LayoutShowcase";
import LayoutBold from "@/pages/home/LayoutBold";
import LayoutBoutique from "@/pages/home/LayoutBoutique";
import { useLayout } from "@/contexts/LayoutContext";
import StorefrontShop from "@/components/StorefrontShop";
import Footer from "@/components/Footer";

import { useTheme } from "@/contexts/ThemeContext";

const LayoutTechGrid = () => (
  <div className="min-h-screen bg-background text-foreground flex flex-col">
    <Navbar />
    <div className="flex-1">
      <StorefrontShop />
    </div>
    <div className="hidden md:block">
      <Footer />
    </div>
  </div>
);

const Index = () => {
  const { layout, loading } = useLayout();
  const { theme } = useTheme();

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  
  const getLayout = () => {
    switch (layout) {
      case "magazine":   return <LayoutMagazine />;
      case "minimal":    return <LayoutMinimal />;
      case "showcase":   return <LayoutShowcase />;
      case "bold":       return <LayoutBold />;
      case "boutique":   return <LayoutBoutique />;
      default:           return <LayoutTechGrid />;
    }
  };

  return (
    <div className={theme === "dark" ? "dark bg-background" : "bg-background"}>
      {getLayout()}
    </div>
  );
};

export default Index;
