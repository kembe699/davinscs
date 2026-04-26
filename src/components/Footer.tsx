import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, type ApiCategory, type CompanySettings } from "@/lib/api";
import { useTenantPath } from "@/contexts/TenantContext";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const tp = useTenantPath();
  const { t } = useTranslation();

  useEffect(() => {
    api.company.get().then(setCompany).catch(() => {});
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  const waNumber = company?.whatsapp || "256792149296";
  const waUrl    = `https://wa.me/${waNumber}`;
  const sf = company?.storefront_settings || {};

  const connectLinks = [
    { label: "Instagram", url: (sf as any).instagram_url as string | undefined },
    { label: "YouTube", url: (sf as any).youtube_url as string | undefined },
    { label: "Twitter / X", url: (sf as any).twitter_url as string | undefined },
    { label: "Newsletter", url: (sf as any).newsletter_url as string | undefined },
  ].filter((l) => !!l.url);

  const topCategories = categories
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, 8);

  return (
    <footer className="border-t border-border-subtle">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to={tp("/")} className="flex items-center mb-4">
              {company?.logo
                ? <img src={company.logo} alt={company.name} className="h-20 w-auto object-contain" />
                : <span className="font-bold text-foreground tracking-widest uppercase">{company?.name}</span>
              }
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-4">
              {company?.description || "Professional media equipment for filmmakers, podcasters, and content creators."}
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {(company?.address || company?.city) && (
                <p>📍 {company?.address}{company?.address && company?.city ? ", " : ""}{company?.city}</p>
              )}
              {company?.phone && (
                <a href={`tel:${company.phone}`} className="block pt-1 hover:text-primary transition-colors">📞 {company.phone}</a>
              )}
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block text-[#25D366] hover:text-[#1ebe5d] transition-colors">💬 {t('storefront.footer.whatsapp')}</a>
              {company?.email && (
                <a href={`mailto:${company.email}`} className="block hover:text-primary transition-colors">✉️ {company.email}</a>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Equipment</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {topCategories.length > 0 ? (
                topCategories.map((c) => (
                  <li key={c.slug}>
                    <Link to={tp(`/${c.slug}`)} className="hover:text-primary transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground/70">No categories yet</li>
              )}
            </ul>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to={tp("/contact")} className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {connectLinks.length > 0 ? (
                connectLinks.map((l) => (
                  <li key={l.label}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground/70">No links configured</li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-border-subtle pt-8 flex items-center justify-center">
          <div className="font-mono-tech text-[10px] text-muted-foreground text-center">
            © {new Date().getFullYear()} {company?.name || "Sega Bsiness"}. {t('storefront.footer.rights')}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
