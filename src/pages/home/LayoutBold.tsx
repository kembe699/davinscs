import Navbar from "@/components/Navbar";
import StorefrontShop from "@/components/StorefrontShop";
import Footer from "@/components/Footer";

export default function LayoutBold() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1">
        <StorefrontShop />
      </div>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}
