import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, Layers, Users, LogOut, PackageCheck, ShoppingCart, DollarSign, FileText, CreditCard, Percent, Tag, Globe, Building, Monitor, ShoppingBag } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: Monitor },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Layers },
  { label: "Inventory", href: "/admin/inventory", icon: PackageCheck },
  { label: "Procurement", href: "/admin/procurement", icon: ShoppingCart },
  { label: "Accounting", href: "/admin/accounting", icon: DollarSign },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Payment Types", href: "/admin/payment-types", icon: CreditCard },
  { label: "Tax Rates", href: "/admin/tax-rates", icon: Percent },
  { label: "Price Lists", href: "/admin/price-lists", icon: Tag },
  { label: "Promotions", href: "/admin/promotions", icon: Tag },
  { label: "My Company", href: "/admin/company", icon: Building },
  { label: "Users", href: "/admin/users", icon: Users },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-admin-bg flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-admin-border flex flex-col bg-admin-bg sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 border-b border-admin-border">
          <Link to="/">
            <img src="/logo.jpeg" alt="Davin's" className="h-10 object-contain" />
          </Link>
          <p className="font-mono text-[9px] text-admin-text-secondary tracking-[0.3em] uppercase mt-2">ADMIN PANEL</p>
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
