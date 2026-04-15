import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MarqueeBanner from "@/components/MarqueeBanner";
import CategoryGrid from "@/components/CategoryGrid";
import AboutSection from "@/components/AboutSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <MarqueeBanner />
      <CategoryGrid />
      <AboutSection />
      <MarqueeBanner />
      <Footer />
    </div>
  );
};

export default Index;
