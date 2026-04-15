import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border-subtle">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src="/logo.jpeg" alt="Davin's Camera Store" className="h-12 w-auto object-contain" />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-4">
              Professional media equipment for filmmakers, podcasters, and content creators.
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>📍 London Chambers GF Shop 16<br />Johnson Street, Kampala</p>
              <a href="tel:+256757774682" className="block pt-1 hover:text-primary transition-colors">📞 0757-774682</a>
              <a href="https://wa.me/256792149296" target="_blank" rel="noopener noreferrer" className="block text-[#25D366] hover:text-[#1ebe5d] transition-colors">💬 WhatsApp Us</a>
              <p>✉️ infor@davinsstore</p>
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
            © 2025 Davin's Camera Store. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
