import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext.tsx";
import ToastContainer from "./components/ToastContainer.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext.tsx";
import { LayoutProvider } from "./contexts/LayoutContext.tsx";
import { TenantRoot } from "./contexts/TenantContext.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/Login.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import AdminProducts from "./pages/admin/Products.tsx";
import ProductForm from "./pages/admin/ProductForm.tsx";
import AdminCategories from "./pages/admin/Categories.tsx";
import Tables from "./pages/admin/Tables.tsx";
import AdminUsers from "./pages/admin/Users.tsx";
import ResetPassword from "./pages/admin/ResetPassword.tsx";
import Inventory from "./pages/admin/Inventory.tsx";
import Procurement from "./pages/admin/Procurement.tsx";
import Accounting from "./pages/admin/Accounting.tsx";
import ReportsNew from "./pages/admin/ReportsNew.tsx";
import Company from "./pages/admin/Company.tsx";
import POSMain from "./pages/pos/POSMain.tsx";
import SalesHistory from "./pages/pos/SalesHistory.tsx";
import CashManagement from "./pages/pos/CashManagement.tsx";
import EndOfDay from "./pages/pos/EndOfDay.tsx";
import ReceiptVerify from "./pages/pos/ReceiptVerify.tsx";
import PaymentTypes from "./pages/admin/PaymentTypes.tsx";
import TaxRates from "./pages/admin/TaxRates.tsx";
import CurrenciesEnhanced from "./pages/admin/CurrenciesEnhanced.tsx";
import PriceLists from "./pages/admin/PriceLists.tsx";
import Invoices from "./pages/admin/Invoices.tsx";
import Receipts from "./pages/admin/Receipts.tsx";
import Promotions from "./pages/admin/Promotions.tsx";
import CashflowReport from "./pages/admin/CashflowReport.tsx";
import AuditTrail from "./pages/admin/AuditTrail.tsx";
import Customers from "./pages/admin/Customers.tsx";
import CustomerDetail from "./pages/admin/CustomerDetail.tsx";
import Quotations from "./pages/admin/Quotations.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Portal from "./pages/Portal.tsx";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const queryClient = new QueryClient();

function UserPreferencesSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (user) {
      const savedLang = localStorage.getItem(`i18nextLng_${user.id}`);
      if (savedLang && i18n.language !== savedLang) {
        i18n.changeLanguage(savedLang);
      }
    }
  }, [user, i18n]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { tenantSlug } = useParams();
  
  if (!token) {
    if (tenantSlug) {
      return <Navigate to={`/${tenantSlug}/admin/login`} replace />;
    }
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}

import { useTheme } from "./contexts/ThemeContext.tsx";
import { Outlet } from "react-router-dom";

function ThemeWrapper() {
  const { theme } = useTheme();
  return (
    <div
      className={theme === "dark" ? "dark bg-background text-foreground min-h-screen" : "bg-background text-foreground min-h-screen"}
      data-theme={theme}
    >
      <Outlet />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UserPreferencesSync />
      <ThemeProvider>
      <ToastProvider>
        <ToastContainer />
        <LayoutProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Universal entry point — always accessible */}
            <Route path="/portal" element={<Portal />} />
            {/* Root redirect → portal */}
            <Route path="/" element={<Navigate to="/portal" replace />} />

            {/* All tenant routes live under /:tenantSlug */}
            <Route path="/:tenantSlug" element={<TenantRoot />}>

              <Route element={<ThemeWrapper />}>
                <Route index element={<Navigate to="admin" replace />} />
                <Route path="setup" element={<Onboarding />} />

                {/* POS */}
                <Route path="pos" element={<ProtectedRoute><POSMain /></ProtectedRoute>} />
                <Route path="pos/sales-history" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
                <Route path="pos/cash-management" element={<ProtectedRoute><CashManagement /></ProtectedRoute>} />
                <Route path="pos/end-of-day" element={<ProtectedRoute><EndOfDay /></ProtectedRoute>} />
                <Route path="verify/:saleNumber" element={<ReceiptVerify />} />
              </Route>

              {/* Admin CMS (Not wrapped in ThemeWrapper so it doesn't get .dark) */}
              <Route path="admin/login" element={<AdminLogin />} />
              <Route path="admin/reset-password" element={<ResetPassword />} />
              <Route path="admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
              <Route path="admin/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="admin/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="admin/categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
              <Route path="admin/tables" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
              <Route path="admin/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="admin/procurement" element={<ProtectedRoute><Procurement /></ProtectedRoute>} />
              <Route path="admin/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
              <Route path="admin/reports" element={<ProtectedRoute><ReportsNew /></ProtectedRoute>} />
              <Route path="admin/payment-types" element={<ProtectedRoute><PaymentTypes /></ProtectedRoute>} />
              <Route path="admin/tax-rates" element={<ProtectedRoute><TaxRates /></ProtectedRoute>} />
              <Route path="admin/currencies" element={<ProtectedRoute><CurrenciesEnhanced /></ProtectedRoute>} />
              <Route path="admin/price-lists" element={<ProtectedRoute><PriceLists /></ProtectedRoute>} />
              <Route path="admin/promotions" element={<ProtectedRoute><Promotions /></ProtectedRoute>} />
              <Route path="admin/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="admin/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
              <Route path="admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
              <Route path="admin/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
              <Route path="admin/cashflow" element={<ProtectedRoute><CashflowReport /></ProtectedRoute>} />
              <Route path="admin/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
              <Route path="admin/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="admin/customers/:id" element={<ProtectedRoute><CustomerDetail /></ProtectedRoute>} />
              <Route path="admin/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LayoutProvider>
      </ToastProvider>
      </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
