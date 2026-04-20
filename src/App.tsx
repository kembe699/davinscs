import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { LayoutProvider } from "./contexts/LayoutContext.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import CamerasPage from "./pages/categories/Cameras.tsx";
import LensesPage from "./pages/categories/Lenses.tsx";
import MicrophonesPage from "./pages/categories/Microphones.tsx";
import TelepromptersPage from "./pages/categories/Teleprompters.tsx";
import LightingPage from "./pages/categories/Lighting.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import DynamicCategoryPage from "./pages/categories/DynamicCategoryPage.tsx";
import Contact from "./pages/Contact.tsx";
import Support from "./pages/Support.tsx";
import Shipping from "./pages/Shipping.tsx";
import Returns from "./pages/Returns.tsx";
import Warranty from "./pages/Warranty.tsx";
import AdminLogin from "./pages/admin/Login.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/Products.tsx";
import ProductForm from "./pages/admin/ProductForm.tsx";
import AdminCategories from "./pages/admin/Categories.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import ResetPassword from "./pages/admin/ResetPassword.tsx";
import Inventory from "./pages/admin/Inventory.tsx";
import Orders from "./pages/admin/Orders.tsx";
import Procurement from "./pages/admin/Procurement.tsx";
import Accounting from "./pages/admin/Accounting.tsx";
import ReportsNew from "./pages/admin/ReportsNew.tsx";
import Company from "./pages/admin/Company.tsx";
import Cart from "./pages/Cart.tsx";
import Checkout from "./pages/Checkout.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import POSMain from "./pages/pos/POSMain.tsx";
import SalesHistory from "./pages/pos/SalesHistory.tsx";
import CashManagement from "./pages/pos/CashManagement.tsx";
import EndOfDay from "./pages/pos/EndOfDay.tsx";
import PaymentTypes from "./pages/admin/PaymentTypes.tsx";
import TaxRates from "./pages/admin/TaxRates.tsx";
import CurrenciesEnhanced from "./pages/admin/CurrenciesEnhanced.tsx";
import PriceLists from "./pages/admin/PriceLists.tsx";
import Invoices from "./pages/admin/Invoices.tsx";
import Promotions from "./pages/admin/Promotions.tsx";
import CashflowReport from "./pages/admin/CashflowReport.tsx";
import AuditTrail from "./pages/admin/AuditTrail.tsx";
import Customers from "./pages/admin/Customers.tsx";
import CustomerDetail from "./pages/admin/CustomerDetail.tsx";
import Quotations from "./pages/admin/Quotations.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <LayoutProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            {/* Admin CMS */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/admin/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/admin/procurement" element={<ProtectedRoute><Procurement /></ProtectedRoute>} />
            <Route path="/admin/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute><ReportsNew /></ProtectedRoute>} />
            <Route path="/admin/payment-types" element={<ProtectedRoute><PaymentTypes /></ProtectedRoute>} />
            <Route path="/admin/tax-rates" element={<ProtectedRoute><TaxRates /></ProtectedRoute>} />
            <Route path="/admin/currencies" element={<ProtectedRoute><CurrenciesEnhanced /></ProtectedRoute>} />
            <Route path="/admin/price-lists" element={<ProtectedRoute><PriceLists /></ProtectedRoute>} />
            <Route path="/admin/promotions" element={<ProtectedRoute><Promotions /></ProtectedRoute>} />
            <Route path="/admin/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
            <Route path="/admin/cashflow" element={<ProtectedRoute><CashflowReport /></ProtectedRoute>} />
            <Route path="/admin/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/admin/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
            <Route path="/admin/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
            <Route path="/admin/reset-password" element={<ResetPassword />} />
            <Route path="/pos" element={<ProtectedRoute><POSMain /></ProtectedRoute>} />
            <Route path="/pos/sales-history" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
            <Route path="/pos/cash-management" element={<ProtectedRoute><CashManagement /></ProtectedRoute>} />
            <Route path="/pos/end-of-day" element={<ProtectedRoute><EndOfDay /></ProtectedRoute>} />
            {/* E-commerce */}
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            {/* Generic product detail (for StorefrontShop links) */}
            <Route path="/product/:slug" element={<ProductDetail />} />
            {/* Dynamic category catch-all — handles any slug from DB */}
            <Route path="/:slug" element={<DynamicCategoryPage />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LayoutProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
