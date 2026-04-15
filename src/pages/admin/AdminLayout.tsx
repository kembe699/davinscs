import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, Layers, Users, LogOut, ChevronRight } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Layers },
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border-subtle flex flex-col bg-chassis sticky top-0 h-screen">
        <div className="p-5 border-b border-border-subtle">
          <Link to="/">
            <img src="/logo.jpeg" alt="Davin's" className="h-10 object-contain" />
          </Link>
          <p className="font-mono-tech text-[9px] text-primary tracking-[0.3em] uppercase mt-2">CMS Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-grip"
                }`}
              >
                <item.icon size={15} />
                {item.label}
                {active && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <p className="font-mono-tech text-[9px] text-muted-foreground uppercase tracking-widest truncate mb-3">
            {user?.email}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
