import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import CamerasPage from "./pages/categories/Cameras.tsx";
import LensesPage from "./pages/categories/Lenses.tsx";
import MicrophonesPage from "./pages/categories/Microphones.tsx";
import TelepromptersPage from "./pages/categories/Teleprompters.tsx";
import LightingPage from "./pages/categories/Lighting.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Contact from "./pages/Contact.tsx";
import Support from "./pages/Support.tsx";
import Shipping from "./pages/Shipping.tsx";
import Returns from "./pages/Returns.tsx";
import Warranty from "./pages/Warranty.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* Category listing pages */}
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/lenses" element={<LensesPage />} />
          <Route path="/microphones" element={<MicrophonesPage />} />
          <Route path="/teleprompters" element={<TelepromptersPage />} />
          <Route path="/lighting" element={<LightingPage />} />
          {/* Product detail pages */}
          <Route path="/cameras/:id" element={<ProductDetail />} />
          <Route path="/lenses/:id" element={<ProductDetail />} />
          <Route path="/microphones/:id" element={<ProductDetail />} />
          <Route path="/teleprompters/:id" element={<ProductDetail />} />
          <Route path="/lighting/:id" element={<ProductDetail />} />
          {/* Support / Info pages */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Support />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/warranty" element={<Warranty />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
