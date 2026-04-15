import { Link } from "react-router-dom";
import { RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const steps = [
  {
    step: "01",
    title: "Initiate Your Return",
    body: "Contact our support team via email or phone within 30 days of delivery. Include your order number and reason for return.",
  },
  {
    step: "02",
    title: "Receive a Return Label",
    body: "We'll email you a prepaid return shipping label (domestic orders). International returns ship at the customer's expense.",
  },
  {
    step: "03",
    title: "Pack & Ship",
    body: "Repackage the item in its original box with all accessories, manuals, and packaging materials intact.",
  },
  {
    step: "04",
    title: "Refund Processed",
    body: "Once we receive and inspect the item, your refund is issued within 3–5 business days to the original payment method.",
  },
];

const eligible = [
  "Unused, unopened items in original sealed packaging",
  "Items with all original accessories, manuals, and packaging",
  "Products returned within 30 days of the delivery date",
  "Items that arrived damaged or defective",
  "Wrong item shipped",
];

const notEligible = [
  "Opened software, memory cards, or consumables",
  "Items showing signs of use, modification, or physical damage caused by the customer",
  "Special-order or custom-configured items",
  "Items returned after 30 days without prior authorization",
  "Gift cards and downloadable content",
];

const Returns = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            RETURN_POLICY
          </div>
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
            Returns &{" "}
            <span className="font-bold text-primary">Exchanges</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
            We stand behind every product we sell. If something isn't right, our 30-day hassle-free return policy has you covered.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20 space-y-16">

        {/* Key policy callout */}
        <div className="border border-primary/30 bg-primary/5 p-6 lg:p-8 flex gap-4 items-start">
          <RotateCcw size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground mb-1">30-Day Return Window</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All eligible purchases can be returned within 30 days of delivery for a full refund or exchange — no restocking fees on domestic returns.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div>
          <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-8">
            How to Return an Item
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
            {steps.map((s) => (
              <div key={s.step} className="bg-chassis p-6 lg:p-8 flex flex-col gap-4">
                <span className="font-mono-tech text-3xl font-bold text-primary/30">{s.step}</span>
                <h3 className="font-bold text-foreground text-sm">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible / Not Eligible */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border-subtle p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle size={18} className="text-primary" />
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">
                Eligible for Return
              </h2>
            </div>
            <ul className="space-y-3">
              {eligible.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-border-subtle p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <XCircle size={18} className="text-muted-foreground" />
              <h2 className="font-mono-tech text-[10px] text-muted-foreground tracking-[0.4em] uppercase">
                Not Eligible for Return
              </h2>
            </div>
            <ul className="space-y-3">
              {notEligible.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/50 shrink-0 mt-0.5">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Exchanges */}
        <div className="border border-border-subtle p-6 lg:p-8 bg-grip/20">
          <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            Exchanges
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
            Want a different item instead of a refund? Let us know when you initiate your return and we'll hold the replacement in stock for you. Exchanges are processed within 1–2 business days of receiving the original item.
          </p>
        </div>

        {/* Defective / Damaged */}
        <div className="border border-border-subtle p-6 lg:p-8 bg-grip/20 flex gap-4 items-start">
          <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground text-sm mb-2">Received a Damaged or Defective Item?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Contact us within 72 hours of delivery with photos of the damage. We'll arrange a free replacement or full refund with priority processing — no need to return the item in most cases.
            </p>
          </div>
        </div>

        <div className="border border-border-subtle p-6 bg-grip/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Ready to start a return?</p>
            <p className="text-sm text-muted-foreground">Our team will guide you through the process.</p>
          </div>
          <Link
            to="/contact"
            className="shrink-0 h-11 px-6 bg-foreground text-background font-bold uppercase tracking-widest text-xs flex items-center hover:bg-primary transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Returns;
