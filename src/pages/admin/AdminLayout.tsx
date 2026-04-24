import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  LayoutDashboard, Package, Layers, Users, LogOut, PackageCheck, ShoppingCart,
  DollarSign, FileText, CreditCard, Percent, Tag, Globe, Building, Monitor,
  ShoppingBag, Receipt, Shield, Activity, UserCheck, ClipboardList,
  ChevronDown, ChevronRight, BarChart2, Wallet, Moon, Sun, Menu, X,
} from "lucide-react";

type NavItem = { label: string; path: string; icon: any; permission: string };
type NavGroup = { label: string; icon: any; items: NavItem[] };

const TOP_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/admin",  icon: LayoutDashboard, permission: "dashboard.view" },
  { label: "POS",       path: "/pos",    icon: Monitor,          permission: "pos.access" },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sales",
    icon: ShoppingBag,
    items: [
      { label: "Customers",   path: "/admin/customers",   icon: UserCheck,    permission: "orders.view" },
      { label: "Quotations",  path: "/admin/quotations",  icon: ClipboardList,permission: "invoices.view" },
      { label: "Invoices",    path: "/admin/invoices",    icon: Receipt,      permission: "invoices.view" },
      { label: "Orders",      path: "/admin/orders",      icon: ShoppingCart, permission: "orders.view" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { label: "Products",    path: "/admin/products",    icon: Package,      permission: "products.view" },
      { label: "Categories",  path: "/admin/categories",  icon: Layers,       permission: "categories.view" },
      { label: "Stock",       path: "/admin/inventory",   icon: PackageCheck, permission: "inventory.view" },
      { label: "Procurement", path: "/admin/procurement", icon: ShoppingCart, permission: "procurement.view" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    items: [
      { label: "Accounting",    path: "/admin/accounting",    icon: DollarSign, permission: "accounting.view" },
      { label: "Cashflow",      path: "/admin/cashflow",      icon: Wallet,     permission: "reports.view" },
      { label: "Currencies",    path: "/admin/currencies",    icon: Globe,      permission: "currencies.view" },
      { label: "Payment Types", path: "/admin/payment-types", icon: CreditCard, permission: "payment_types.view" },
      { label: "Tax Rates",     path: "/admin/tax-rates",     icon: Percent,    permission: "tax_rates.view" },
      { label: "Price Lists",   path: "/admin/price-lists",   icon: Tag,        permission: "price_lists.view" },
      { label: "Promotions",    path: "/admin/promotions",    icon: Tag,        permission: "promotions.view" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart2,
    items: [
      { label: "Reports",     path: "/admin/reports",     icon: FileText,  permission: "reports.view" },
      { label: "Audit Trail", path: "/admin/audit-trail", icon: Activity,  permission: "reports.view" },
    ],
  },
  {
    label: "Settings",
    icon: Building,
    items: [
      { label: "My Company", path: "/admin/company", icon: Building, permission: "company.view" },
      { label: "Users",      path: "/admin/users",   icon: Users,    permission: "users.view" },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const { logo, companyName } = useLayout();
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user?.role_name?.toLowerCase() === 'cashier') {
      navigate(`/${tenantSlug}/admin/pos`, { replace: true });
    }
  }, [user, navigate, tenantSlug]);

  const tp = (path: string) => `/${tenantSlug}${path}`;

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === tp("/admin")
      : location.pathname.startsWith(tp(path));

  const groupHasActive = (group: NavGroup) =>
    group.items.some(i => isActive(i.path));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { if (groupHasActive(g)) init[g.label] = true; });
    return init;
  });

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => { logout(); navigate(tp("/admin/login")); };
  const closeSidebar = () => setSidebarOpen(false);

  function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="p-1.5 border border-admin-border text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors"
      >
        {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
      </button>
    );
  }

  const SidebarInner = () => (
    <div className="flex flex-col h-full bg-admin-bg border-r border-admin-border">
      {/* Logo */}
      <div className="p-4 border-b border-admin-border flex items-center justify-between">
        <Link to={tp("/")} onClick={closeSidebar}>
          {logo
            ? <img src={logo} alt={companyName || "Logo"} className="h-12 object-contain" />
            : <span className="font-bold text-sm text-admin-text tracking-widest uppercase">{companyName}</span>
          }
        </Link>
        <button onClick={closeSidebar} className="lg:hidden p-1 text-admin-text-secondary hover:text-admin-text">
          <X size={18} />
        </button>
      </div>
      <div className="px-4 py-2 border-b border-admin-border/50 flex items-center justify-between">
        <p className="font-mono text-[9px] text-admin-text-secondary tracking-[0.3em] uppercase">Admin Panel</p>
        {user?.role_name && (
          <span className="flex items-center gap-1 text-[8px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
            <Shield size={8} />{user.role_name}
          </span>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {TOP_ITEMS.filter(i => hasPermission(i.permission)).map(item => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} to={tp(item.path)} onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded ${
                active
                  ? "bg-admin-surface text-admin-text border border-admin-border"
                  : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
              }`}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-admin-border/50" />

        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(i => hasPermission(i.permission));
          if (visibleItems.length === 0) return null;
          const isOpen = !!openGroups[group.label];
          const hasActive = groupHasActive(group);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
                  hasActive
                    ? "text-admin-text"
                    : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <group.icon size={14} />
                  {group.label}
                </span>
                {isOpen
                  ? <ChevronDown size={12} className="opacity-60" />
                  : <ChevronRight size={12} className="opacity-40" />
                }
              </button>

              {isOpen && (
                <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-admin-border/50 space-y-0.5">
                  {visibleItems.map(item => {
                    const active = isActive(item.path);
                    return (
                      <Link key={item.path} to={tp(item.path)} onClick={closeSidebar}
                        className={`flex items-center gap-2.5 px-2.5 py-2 text-sm rounded transition-colors ${
                          active
                            ? "bg-admin-surface text-admin-text border border-admin-border"
                            : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
                        }`}
                      >
                        <item.icon size={13} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-admin-border">
        <p className="font-mono text-[9px] text-admin-text-secondary uppercase tracking-widest truncate mb-3">
          {user?.email}
        </p>
        <div className="flex items-center justify-between">
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-admin-text-secondary hover:text-admin-danger transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-admin-bg flex flex-col">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-admin-bg border-b border-admin-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface rounded transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex-1 min-w-0">
          {logo
            ? <img src={logo} alt={companyName || "Logo"} className="h-8 object-contain" />
            : <span className="font-bold text-sm text-admin-text tracking-widest uppercase truncate">{companyName}</span>
          }
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col sticky top-0 h-screen overflow-y-auto">
          <SidebarInner />
        </aside>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeSidebar}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 z-50 overflow-y-auto">
              <SidebarInner />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-admin-bg min-w-0">{children}</main>
      </div>
    </div>
  );
}
