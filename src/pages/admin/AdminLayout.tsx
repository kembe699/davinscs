import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { LayoutDashboard, Package, Layers, Users, LogOut, PackageCheck, ShoppingCart, DollarSign, FileText, CreditCard, Percent, Tag, Globe, Building, Monitor, ShoppingBag, Receipt, Shield, TrendingUp, Activity, UserCheck, ClipboardList } from "lucide-react";

const allNavItems = [
  { label: "Dashboard",    href: "/admin",                icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "POS",          href: "/pos",                  icon: Monitor,         permission: "pos.access" },
  { label: "Orders",       href: "/admin/orders",         icon: ShoppingBag,     permission: "orders.view" },
  { label: "Products",     href: "/admin/products",       icon: Package,         permission: "products.view" },
  { label: "Categories",   href: "/admin/categories",     icon: Layers,          permission: "categories.view" },
  { label: "Inventory",    href: "/admin/inventory",      icon: PackageCheck,    permission: "inventory.view" },
  { label: "Procurement",  href: "/admin/procurement",    icon: ShoppingCart,    permission: "procurement.view" },
  { label: "Accounting",   href: "/admin/accounting",     icon: DollarSign,      permission: "accounting.view" },
  { label: "Currencies",   href: "/admin/currencies",     icon: Globe,           permission: "currencies.view" },
  { label: "Invoices",     href: "/admin/invoices",       icon: Receipt,         permission: "invoices.view" },
  { label: "Reports",      href: "/admin/reports",        icon: FileText,        permission: "reports.view" },
  { label: "Cashflow",     href: "/admin/cashflow",       icon: TrendingUp,      permission: "reports.view" },
  { label: "Audit Trail",  href: "/admin/audit-trail",    icon: Activity,        permission: "reports.view" },
  { label: "Customers",    href: "/admin/customers",      icon: UserCheck,       permission: "orders.view" },
  { label: "Quotations",   href: "/admin/quotations",     icon: ClipboardList,   permission: "invoices.view" },
  { label: "Payment Types",href: "/admin/payment-types",  icon: CreditCard,      permission: "payment_types.view" },
  { label: "Tax Rates",    href: "/admin/tax-rates",      icon: Percent,         permission: "tax_rates.view" },
  { label: "Price Lists",  href: "/admin/price-lists",    icon: Tag,             permission: "price_lists.view" },
  { label: "Promotions",   href: "/admin/promotions",     icon: Tag,             permission: "promotions.view" },
  { label: "My Company",   href: "/admin/company",        icon: Building,        permission: "company.view" },
  { label: "Users",        href: "/admin/users",          icon: Users,           permission: "users.view" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const { logo, companyName } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navItems = allNavItems.filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-admin-bg flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-admin-border flex flex-col bg-admin-bg sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 border-b border-admin-border">
          <Link to="/">
            {logo
              ? <img src={logo} alt={companyName || "Logo"} className="h-16 object-contain" />
              : <span className="font-bold text-sm text-admin-text tracking-widest uppercase">{companyName}</span>
            }
          </Link>
          <div className="mt-2 flex items-center justify-between">
            <p className="font-mono text-[9px] text-admin-text-secondary tracking-[0.3em] uppercase">ADMIN PANEL</p>
            {user?.role_name && (
              <span className="flex items-center gap-1 text-[8px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                <Shield size={8} />{user.role_name}
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded ${
                  active
                    ? "bg-admin-surface text-admin-text border border-admin-border"
                    : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-admin-border">
          <p className="font-mono text-[9px] text-admin-text-secondary uppercase tracking-widest truncate mb-3">
            {user?.email}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-admin-text-secondary hover:text-admin-danger transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-admin-bg">{children}</main>
    </div>
  );
}
