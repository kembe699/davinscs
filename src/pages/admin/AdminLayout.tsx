import { ReactNode, useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLayout } from "@/contexts/LayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  LayoutDashboard, Package, Layers, Users, LogOut, PackageCheck, ShoppingCart,
  DollarSign, FileText, CreditCard, Percent, Tag, Globe, Building, Monitor,
  ShoppingBag, Receipt, Shield, Activity, UserCheck, ClipboardList,
  ChevronDown, ChevronRight, BarChart2, Wallet, Moon, Sun, Menu, X, ExternalLink,
  CalendarClock, AlertTriangle, UtensilsCrossed, Warehouse,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import IdleWarningModal from "@/components/IdleWarningModal";

type NavItem = { label: string; path: string; icon: any; permission: string; foodOnly?: boolean };
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
      { label: "Receipts",    path: "/admin/receipts",    icon: Receipt,      permission: "reports.view" },
      { label: "Tables",      path: "/admin/tables",      icon: UtensilsCrossed, permission: "products.view", foodOnly: true },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { label: "Categories",  path: "/admin/categories",  icon: Layers,       permission: "categories.view" },
      { label: "Products",    path: "/admin/products",    icon: Package,      permission: "products.view" },
      { label: "Stock",       path: "/admin/inventory",   icon: PackageCheck, permission: "inventory.view" },
      { label: "Storage",     path: "/admin/storage-locations", icon: Warehouse, permission: "inventory.view" },
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
  const { logo, companyName, company } = useLayout();
  const businessType = company?.business_type || "";
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug, status: tenantStatus, trialEndsAt, subscriptionEnd } = useTenant();

  function getExpiryInfo() {
    let expiryDate: Date | null = null;
    let label = "";
    if (tenantStatus === "trial" && trialEndsAt) {
      expiryDate = new Date(trialEndsAt);
      label = "Trial";
    } else if (tenantStatus === "active" && subscriptionEnd) {
      expiryDate = new Date(subscriptionEnd);
      label = "Subscription";
    }
    if (!expiryDate) return null;
    const msLeft = expiryDate.getTime() - Date.now();
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    return { label, daysLeft, expiryDate };
  }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t, i18n } = useTranslation();

  // Handle document direction for Arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    const roleName = user?.role_name?.toLowerCase();
    if (roleName === 'cashier' || roleName === 'waiter') {
      navigate(`/${tenantSlug}/pos`, { replace: true });
    }
  }, [user, navigate, tenantSlug]);

  const tp = (path: string) => `/${tenantSlug}${path}`;

  const handleLogout = useCallback(() => {
    logout();
    navigate(tp("/admin/login"), { replace: true });
  }, [logout, navigate, tenantSlug]);

  const { showWarning, secondsLeft, resetTimer } = useIdleTimeout({
    timeoutMs: 5 * 60 * 1000,
    warningMs: 60 * 1000,
    onTimeout: handleLogout,
  });

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

  const handleLogoutBtn = () => { logout(); navigate(tp("/admin/login")); };
  const closeSidebar = () => setSidebarOpen(false);

  function ThemeToggle() {
    const { theme, setTheme } = useTheme("admin");
    return (
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="p-1.5 border border-admin-border text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors rounded"
      >
        {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
      </button>
    );
  }

  function LanguageToggle({ direction = "up" }: { direction?: "up" | "down" }) {
    const [open, setOpen] = useState(false);
    
    const changeLanguage = (lng: string) => {
      i18n.changeLanguage(lng);
      if (user) {
        localStorage.setItem(`i18nextLng_${user.id}`, lng);
      }
      setOpen(false);
    };

    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 flex items-center gap-1 border border-admin-border text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors rounded"
        >
          <Globe size={13} />
          <span className="text-[10px] uppercase font-mono leading-none">{i18n.language.split('-')[0]}</span>
        </button>
        {open && (
          <div className={`absolute ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} right-0 w-24 bg-admin-bg border border-admin-border shadow-xl z-50 rounded overflow-hidden`}>
            <button onClick={() => changeLanguage('en')} className="block w-full text-left px-3 py-2 text-xs text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors">English</button>
            <button onClick={() => changeLanguage('ar')} className="block w-full text-left px-3 py-2 text-xs text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors">العربية</button>
            <button onClick={() => changeLanguage('fr')} className="block w-full text-left px-3 py-2 text-xs text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface transition-colors">Français</button>
          </div>
        )}
      </div>
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
        <p className="font-mono text-[9px] text-admin-text-secondary tracking-[0.3em] uppercase">{t('admin.panel')}</p>
        {user?.role_name && (
          <span className="flex items-center gap-1 text-[8px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
            <Shield size={8} />{user.role_name}
          </span>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {TOP_ITEMS.filter(i => hasPermission(i.permission)).map(item => {
          const active = isActive(item.path);
          // @ts-ignore
          const label = item.label === 'Dashboard' ? t('admin.nav.dashboard') : t('admin.nav.pos');
          return (
            <Link key={item.path} to={tp(item.path)} onClick={closeSidebar}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded ${
                active
                  ? "bg-admin-surface text-admin-text border border-admin-border"
                  : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
              }`}
            >
              <item.icon size={15} />
              {label}
            </Link>
          );
        })}

        <div className="my-2 border-t border-admin-border/50" />

        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(i => hasPermission(i.permission) && (!i.foodOnly || businessType === "food"));
          if (visibleItems.length === 0) return null;
          const isOpen = !!openGroups[group.label];
          const hasActive = groupHasActive(group);
          // @ts-ignore
          const groupLabel = t(`admin.groups.${group.label.toLowerCase().replace(' ', '_')}`);
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
                  {groupLabel || group.label}
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
                    const navKey = item.label.toLowerCase().replace(' ', '_');
                    // @ts-ignore
                    const itemLabel = t(`admin.nav.${navKey}`);
                    return (
                      <Link key={item.path} to={tp(item.path)} onClick={closeSidebar}
                        className={`flex items-center gap-2.5 px-2.5 py-2 text-sm rounded transition-colors ${
                          active
                            ? "bg-admin-surface text-admin-text border border-admin-border"
                            : "text-admin-text-secondary hover:text-admin-text hover:bg-admin-surface"
                        }`}
                      >
                        <item.icon size={13} />
                        {itemLabel || item.label}
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
        <p className="font-mono text-[9px] text-admin-text-secondary uppercase tracking-widest truncate mb-1">
          {user?.email}
        </p>
        {(() => {
          const info = getExpiryInfo();
          if (!info) return null;
          const { label, daysLeft, expiryDate } = info;
          const urgent = daysLeft <= 3;
          const warning = daysLeft > 3 && daysLeft <= 7;
          const colorClass = urgent
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : warning
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
            : "border-green-500/40 bg-green-500/10 text-green-400";
          const display = daysLeft <= 0
            ? "Expires today"
            : daysLeft === 1
            ? "1 day left"
            : `${daysLeft} days left`;
          return (
            <a
              href="https://flippedpos.com/account"
              target="_blank"
              rel="noopener noreferrer"
              title={`${label} expires ${expiryDate.toLocaleDateString()}`}
              className={`flex items-center gap-1.5 text-[10px] font-mono border px-2 py-1 mb-2 transition-opacity hover:opacity-80 ${colorClass}`}
            >
              {urgent || warning ? <AlertTriangle size={9} /> : <CalendarClock size={9} />}
              <span className="font-semibold uppercase tracking-wider">{label}</span>
              <span className="opacity-80">— {display}</span>
            </a>
          );
        })()}
        <a
          href="https://flippedpos.com/account"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors mb-3"
        >
          <ExternalLink size={10} />
          My Account
        </a>
        <div className="flex items-center justify-between mt-2">
          <button onClick={handleLogoutBtn}
            className="flex items-center gap-2 text-sm text-admin-text-secondary hover:text-admin-danger transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
          <div className="flex items-center gap-1.5">
            <LanguageToggle direction="up" />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] bg-admin-bg flex flex-col">
      {showWarning && (
        <IdleWarningModal
          secondsLeft={secondsLeft}
          onStay={resetTimer}
          onLogout={handleLogout}
        />
      )}
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
        <div className="flex items-center gap-2">
          <LanguageToggle direction="down" />
          <ThemeToggle />
        </div>
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
