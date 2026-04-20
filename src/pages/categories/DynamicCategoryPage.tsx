import { useParams } from "react-router-dom";
import CategoryListingPage from "@/components/CategoryListingPage";
import StorefrontShop from "@/components/StorefrontShop";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { type Category, categoryMeta } from "@/data/products";

const knownCategories = Object.keys(categoryMeta) as Category[];

export default function DynamicCategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) return null;

  if (knownCategories.includes(slug as Category)) {
    return <CategoryListingPage category={slug as Category} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-20 relative">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-3">
            Category
          </p>
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground capitalize">
            {slug.replace(/-/g, " ")}
          </h1>
        </div>
      </section>
      <StorefrontShop initialCategory={slug} />
      <Footer />
    </div>
  );
}
