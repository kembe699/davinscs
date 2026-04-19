import { useState, useEffect } from "react";
import { Menu, X, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiCategory } from "@/lib/api";
import { useLayout } from "@/contexts/LayoutContext";

const staticLinks = [
  { label: "Support", to: "/support" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const { logo, companyName } = useLayout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const loadCartCount = async () => {
      try {
        const items = await api.cart.get();
        setCartCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } catch {
        setCartCount(0);
      }
    };
    loadCartCount();
    const interval = setInterval(loadCartCount, 5000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const categoryLinks = categories.map((c) => ({
    label: `[${String(c.sort_order).padStart(2, "0")}] ${c.name}`,
    to: `/${c.slug}`,
  }));

  const allLinks = [...categoryLinks, ...staticLinks];

  return (
    <nav className="border-b border-border-subtle px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 bg-chassis/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-8 lg:gap-12">
        <Link to="/" className="flex items-center">
          {logo
            ? <img src={logo} alt={companyName || "Logo"} className="h-14 w-auto object-contain" />
            : <span className="font-bold text-sm text-foreground tracking-widest uppercase">{companyName}</span>
          }
        </Link>
        <div className="hidden lg:flex gap-8 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {allLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-primary transition-colors ${location.pathname.startsWith(link.to) ? "text-primary" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-6 font-mono-tech text-xs">
        <Link to="/cart" className="relative text-foreground hover:text-primary transition-colors">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>
        <span className="text-muted-foreground uppercase tracking-tighter">Status: Open</span>
        <div className="size-2 bg-primary animate-pulse" />
      </div>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden text-foreground"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-chassis border-b border-border-subtle p-6 flex flex-col gap-4 lg:hidden z-50">
          {allLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium uppercase tracking-widest hover:text-primary transition-colors ${location.pathname.startsWith(link.to) ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
