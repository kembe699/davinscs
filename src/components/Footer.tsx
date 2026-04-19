import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, type CompanySettings } from "@/lib/api";

const Footer = () => {
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    api.company.get().then(setCompany).catch(() => {});
  }, []);

  const waNumber = company?.whatsapp || "256792149296";
  const waUrl    = `https://wa.me/${waNumber}`;

  return (
    <footer className="border-t border-border-subtle">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
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
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block text-[#25D366] hover:text-[#1ebe5d] transition-colors">💬 WhatsApp Us</a>
              {company?.email && (
                <a href={`mailto:${company.email}`} className="block hover:text-primary transition-colors">✉️ {company.email}</a>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Equipment</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/cameras" className="hover:text-primary transition-colors">Cameras</Link></li>
              <li><Link to="/lenses" className="hover:text-primary transition-colors">Lenses</Link></li>
              <li><Link to="/microphones" className="hover:text-primary transition-colors">Microphones</Link></li>
              <li><Link to="/teleprompters" className="hover:text-primary transition-colors">Teleprompters</Link></li>
              <li><Link to="/lighting" className="hover:text-primary transition-colors">Lighting</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/shipping" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link to="/returns" className="hover:text-primary transition-colors">Returns</Link></li>
              <li><Link to="/warranty" className="hover:text-primary transition-colors">Warranty</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">YouTube</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Twitter / X</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Newsletter</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border-subtle pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest flex flex-wrap gap-4 sm:gap-8 justify-center">
            <div className="flex gap-2 items-center">
              <span className="text-primary">•</span> Global Shipping
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-primary">•</span> 4.9/5 Rated
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-primary">•</span> Authorized Dealer
            </div>
          </div>
          <div className="font-mono-tech text-[10px] text-muted-foreground">
            © {new Date().getFullYear()} {company?.name || "Davin's Camera Store"}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
