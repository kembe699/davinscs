import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTenantPath } from "@/contexts/TenantContext";
import { useLayout } from "@/contexts/LayoutContext";

const faqs = [
  {
    q: "How do I place an order?",
    a: "Browse products, choose what you need, and place your order. If WhatsApp ordering is enabled by the store, you can also order directly via WhatsApp.",
  },
  {
    q: "Do you offer expert advice before I buy?",
    a: "Yes. Use our Contact page or call us directly and we will guide you on the right option for your business.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Payment methods depend on the store configuration. Contact the store for supported options and payment instructions.",
  },
  {
    q: "Can I pick up my order in-store?",
    a: "Pickup availability depends on the store. Contact the store to confirm pickup options and timelines.",
  },
  {
    q: "Do you ship internationally?",
    a: "Shipping options depend on the store. Contact the store for delivery coverage and timelines.",
  },
  {
    q: "What is your return policy?",
    a: "Return policies depend on the store. Contact the store for return or exchange instructions.",
  },
  {
    q: "Are the products covered by warranty?",
    a: "Warranty coverage depends on the product and the store policy. See the Warranty page for details.",
  },
  {
    q: "Do you offer rental or hire services?",
    a: "Availability of rentals depends on the store. Contact the store to confirm.",
  },
];

const links = [
  { label: "Contact Us", desc: "Speak directly with our gear experts", to: "/contact" },
  { label: "Shipping Info", desc: "Delivery timelines, costs, and carriers", to: "/shipping" },
  { label: "Returns", desc: "30-day hassle-free return policy", to: "/returns" },
  { label: "Warranty", desc: "Manufacturer & extended warranty details", to: "/warranty" },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border-subtle">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-center justify-between gap-4 group"
      >
        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {open && (
        <p className="text-sm text-muted-foreground leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
};

const Support = () => {
  const tp = useTenantPath();
  const { company, companyName } = useLayout();
  const tenantLinks = links.map((l) => ({ ...l, to: tp(l.to) }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            HELP_CENTER
          </div>
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
            Customer{" "}
            <span className="font-bold text-primary">Support</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
            Find answers to common questions below, or use the quick links to reach the right department.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">

          {/* Quick Links */}
          <div className="lg:col-span-1">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
              Quick Links
            </h2>
            <div className="space-y-2">
              {tenantLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex flex-col gap-1 p-4 border border-border-subtle bg-grip/20 hover:border-primary/40 hover:bg-grip/50 transition-colors group"
                >
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {link.label} →
                  </span>
                  <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                    {link.desc}
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-8 border border-border-subtle p-6 bg-grip/20">
              <p className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-3">
                Support Line
              </p>
              {company?.phone ? (
                <a href={`tel:${company.phone}`} className="text-2xl font-bold text-foreground mb-1 block hover:text-primary transition-colors">{company.phone}</a>
              ) : (
                <p className="text-2xl font-bold text-foreground mb-1">{companyName || "Support"}</p>
              )}
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                Contact us during business hours
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-2">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
              Frequently Asked Questions
            </h2>
            <div className="border-t border-border-subtle">
              {faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
            <div className="mt-8 p-6 border border-border-subtle bg-grip/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Still have questions?</p>
                <p className="text-sm text-muted-foreground">Our team typically responds within a few hours.</p>
              </div>
              <Link
                to={tp("/contact")}
                className="shrink-0 h-11 px-6 bg-foreground text-background font-bold uppercase tracking-widest text-xs flex items-center hover:bg-primary transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Support;
