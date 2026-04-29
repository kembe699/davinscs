import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, ShoppingCart, Search, ChevronDown, Globe, Home, LayoutGrid, LifeBuoy } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, ApiCategory } from "@/lib/api";
import { useLayout } from "@/contexts/LayoutContext";
import { useTenantPath } from "@/contexts/TenantContext";

const staticLinks = [
  { label: "Support", to: "/support" },
  { label: "Contact", to: "/contact" },
];

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { logo, companyName } = useLayout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [megaOpen, setMegaOpen] = useState(false);
  const megaLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openMega  = () => { if (megaLeaveTimer.current) clearTimeout(megaLeaveTimer.current); setMegaOpen(true); };
  const closeMega = () => { megaLeaveTimer.current = setTimeout(() => setMegaOpen(false), 120); };
  const location = useLocation();
  const navigate = useNavigate();
  const tp = useTenantPath();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
    setLangOpen(false);
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language.startsWith('ar') ? 'rtl' : 'ltr';
    api.categories.list().then(setCategories).catch(() => {});
  }, [i18n.language]);

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

  useEffect(() => {
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "72px";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (location.pathname !== tp("/")) {
      navigate(tp(`/?q=${encodeURIComponent(searchQuery.trim())}`));
    } else {
      const params = new URLSearchParams(location.search);
      params.set("q", searchQuery.trim());
      navigate(`${location.pathname}?${params.toString()}`);
      const el = document.getElementById("shop");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
    setSearchOpen(false);
  };

  const toggleSearch = () => {
    setSearchOpen(o => !o);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const categoryLinks = categories.map((c) => ({
    label: c.name,
    to: tp(`/${c.slug}`),
  }));
  const tenantStaticLinks = staticLinks.map((l) => ({ ...l, to: tp(l.to) }));

  const visibleCategoryLinks = categoryLinks.slice(0, 4);
  const overflowLinks = categoryLinks.slice(4);

  const overflowCategories = categories.slice(4);

  return (
    <div className="sticky top-0 z-50">
    <nav className="border-b border-border-subtle px-6 lg:px-8 h-16 flex items-center justify-between bg-chassis/95 backdrop-blur-md relative">
      <div className="flex items-center gap-8 lg:gap-12">
        <Link to={tp("/")} className="flex items-center">
          {logo
            ? <img src={logo} alt={companyName || "Logo"} className="h-14 w-auto object-contain" />
            : <span className="font-bold text-sm text-foreground tracking-widest uppercase">{companyName}</span>
          }
        </Link>
        <div className="hidden lg:flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {visibleCategoryLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-primary transition-colors whitespace-nowrap ${location.pathname.startsWith(link.to) ? "text-primary" : ""}`}
            >
              {link.label}
            </Link>
          ))}
          {overflowLinks.length > 0 && (
            <div onMouseEnter={openMega} onMouseLeave={closeMega}>
              <button
                type="button"
                className={`flex items-center gap-1 transition-colors ${megaOpen ? "text-primary" : "hover:text-primary"}`}
              >
                More <ChevronDown size={11} className={`transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
          <div className="w-px h-4 bg-border-subtle" />
          {tenantStaticLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-primary transition-colors whitespace-nowrap ${location.pathname.startsWith(link.to) ? "text-primary" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex items-center gap-4 font-mono-tech text-xs">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center">
          {searchOpen ? (
            <div className="flex items-center gap-1 border border-primary bg-chassis/90 px-2">
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none py-1.5 w-44"
              />
              <button type="submit" className="text-primary hover:text-primary/80">
                <Search size={13} />
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground ml-1">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={toggleSearch} className="text-muted-foreground hover:text-primary transition-colors">
              <Search size={18} />
            </button>
          )}
        </form>
        <Link to={tp("/cart")} className="relative text-foreground hover:text-primary transition-colors">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        {/* Language Switcher */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setLangOpen(!langOpen)} 
            className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors p-1"
          >
            <Globe size={18} />
            <span className="uppercase text-[10px]">{i18n.language.split('-')[0]}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-chassis border border-border-subtle rounded-md shadow-xl overflow-hidden py-1 z-50">
              <button onClick={() => changeLanguage('en')} className="block w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-primary">English</button>
              <button onClick={() => changeLanguage('ar')} className="block w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-primary">العربية</button>
              <button onClick={() => changeLanguage('fr')} className="block w-full text-left px-4 py-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-primary">Français</button>
            </div>
          )}
        </div>

        <span className="text-muted-foreground uppercase tracking-tighter hidden md:inline">Status: Open</span>
        <div className="size-2 bg-primary animate-pulse" />
      </div>

      <div className="flex lg:hidden items-center gap-4">
        <Link to={tp("/cart")} className="relative text-foreground hover:text-primary transition-colors" aria-label="Cart" title="Cart">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-foreground"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          title={mobileOpen ? "Close" : "Menu"}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="absolute top-16 left-0 right-0 bg-chassis border-b border-border-subtle p-6 flex flex-col gap-4 lg:hidden z-50">
          {[...visibleCategoryLinks, ...overflowLinks, ...tenantStaticLinks].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`hover:text-primary transition-colors whitespace-nowrap ${location.pathname.startsWith(link.to) ? "text-primary" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>

    {/* ── Mega menu (hover) ──────────────────────────────── */}
    {overflowCategories.length > 0 && (
      <div
        onMouseEnter={openMega}
        onMouseLeave={closeMega}
        className={`absolute left-0 right-0 bg-chassis border-b border-border-subtle shadow-2xl z-40
          transition-all duration-200 ease-out
          ${megaOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}
      >
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-8">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
            More Categories
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {overflowCategories.map((cat) => (
              <Link
                key={cat.id}
                to={tp(`/${cat.slug}`)}
                className="group/cat flex flex-col gap-3 hover:text-primary transition-colors"
              >
                <div className="aspect-square overflow-hidden border border-border-subtle bg-grip group-hover/cat:border-primary/40 transition-colors">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover opacity-80 group-hover/cat:opacity-100 group-hover/cat:scale-105 transition-all duration-500"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-mono-tech text-2xl font-black text-primary/20">
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-widest text-muted-foreground group-hover/cat:text-primary transition-colors leading-snug">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )}

    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-chassis/95 backdrop-blur-md border-t border-border-subtle">
      <div className="max-w-[1440px] mx-auto px-6 h-[72px] flex items-center justify-around">
        <Link
          to={tp("/")}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono-tech uppercase tracking-widest transition-colors ${location.pathname === tp("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Home size={18} />
          Home
        </Link>
        <a
          href="#shop"
          className="flex flex-col items-center gap-1 text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <LayoutGrid size={18} />
          Shop
        </a>
        <Link
          to={tp("/cart")}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-mono-tech uppercase tracking-widest transition-colors ${location.pathname === tp("/cart") ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ShoppingCart size={18} />
          {cartCount > 0 && (
            <span className="absolute -top-1 right-3 bg-primary text-background text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
          Cart
        </Link>
        <Link
          to={tp("/support")}
          className={`flex flex-col items-center gap-1 text-[10px] font-mono-tech uppercase tracking-widest transition-colors ${location.pathname.startsWith(tp("/support")) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          <LifeBuoy size={18} />
          Support
        </Link>
      </div>
    </div>
    </div>
  );
};

export default Navbar;
