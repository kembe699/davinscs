import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { label: "[01] Cameras", to: "/cameras" },
  { label: "[02] Microphones", to: "/microphones" },
  { label: "[03] Teleprompters", to: "/teleprompters" },
  { label: "[04] Support", to: "/support" },
  { label: "[05] Contact", to: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="border-b border-border-subtle px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 bg-chassis/80 backdrop-blur-md z-50">
      <div className="flex items-center gap-8 lg:gap-12">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-bold tracking-tighter text-xl text-foreground">DAVIN'S</span>
          <span className="font-mono-tech text-[10px] text-primary tracking-[0.2em] uppercase">Camera Store</span>
        </Link>
        <div className="hidden lg:flex gap-8 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {navLinks.map((link) => (
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
          {navLinks.map((link) => (
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
