import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { api, ApiCategory } from "@/lib/api";

const staticLinks = [
  { label: "Support", to: "/support" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const location = useLocation();

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const categoryLinks = categories.map((c) => ({
    label: `[${String(c.sort_order).padStart(2, "0")}] ${c.name}`,
    to: `/${c.slug}`,
  }));

  const allLinks = [...categoryLinks, ...staticLinks];

  return (
    <nav className="border-b border-border-subtle px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 bg-chassis/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-8 lg:gap-12">
        <Link to="/" className="flex items-center">
          <img src="/logo.jpeg" alt="Davin's Camera Store" className="h-10 w-auto object-contain" />
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
