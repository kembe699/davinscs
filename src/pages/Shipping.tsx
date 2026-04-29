import { Link } from "react-router-dom";
import { Truck, Globe, Clock, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useTenantPath } from "@/contexts/TenantContext";

const shippingOptions = [
  {
    name: "Standard Shipping",
    time: "5–7 Business Days",
    cost: "Free on orders over UGX 20,000",
    note: "USPS / UPS Ground",
  },
  {
    name: "Express Shipping",
    time: "2–3 Business Days",
    cost: "From UGX 3,000",
    note: "UPS / FedEx",
  },
  {
    name: "Overnight Shipping",
    time: "Next Business Day",
    cost: "From UGX 8,000",
    note: "FedEx Priority / UPS Next Day",
  },
  {
    name: "Same-Day Dispatch",
    time: "Order before 2PM PST",
    cost: "Included with Express / Overnight",
    note: "In-stock items only",
  },
];

const internationalZones = [
  { zone: "Canada & Mexico", time: "5–10 Business Days", notes: "Duties may apply" },
  { zone: "Europe (EU)", time: "7–14 Business Days", notes: "VAT / import fees at destination" },
  { zone: "UK", time: "7–14 Business Days", notes: "VAT / customs at destination" },
  { zone: "Asia Pacific", time: "10–18 Business Days", notes: "Duties & taxes at destination" },
  { zone: "Rest of World", time: "14–21 Business Days", notes: "Contact us for a quote" },
];

const Shipping = () => {
  const tp = useTenantPath();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            LOGISTICS_INFO
          </div>
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
            Shipping{" "}
            <span className="font-bold text-primary">Info</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
            Fast, reliable delivery of professional equipment. We ship globally with full tracking on every order.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20 space-y-16">

        {/* Key stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border-subtle border border-border-subtle">
          {[
            { icon: <Truck size={20} />, stat: "Same-Day", label: "Dispatch on in-stock items" },
            { icon: <Globe size={20} />, stat: "80+", label: "Countries we ship to" },
            { icon: <Clock size={20} />, stat: "Free", label: "Shipping on orders over $99" },
            { icon: <Package size={20} />, stat: "100%", label: "Orders tracked end-to-end" },
          ].map((item) => (
            <div key={item.stat} className="bg-chassis p-6 lg:p-8 flex flex-col gap-3">
              <span className="text-primary">{item.icon}</span>
              <p className="text-2xl font-bold text-foreground">{item.stat}</p>
              <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest leading-relaxed">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Domestic Shipping */}
        <div>
          <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
            Domestic (United States)
          </h2>
          <div className="border border-border-subtle">
            <div className="grid grid-cols-4 px-4 py-3 bg-grip/40 border-b border-border-subtle">
              {["Service", "Delivery Time", "Cost", "Notes"].map((h) => (
                <span key={h} className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>
            {shippingOptions.map((opt, i) => (
              <div
                key={opt.name}
                className={`grid grid-cols-4 px-4 py-4 items-center ${i < shippingOptions.length - 1 ? "border-b border-border-subtle" : ""}`}
              >
                <span className="text-sm font-semibold text-foreground">{opt.name}</span>
                <span className="font-mono-tech text-[11px] text-primary">{opt.time}</span>
                <span className="text-sm text-muted-foreground">{opt.cost}</span>
                <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">{opt.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* International Shipping */}
        <div>
          <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
            International Shipping
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-[60ch]">
            We ship to over 80 countries worldwide via UPS, FedEx, and DHL. International shipments are fully tracked. Import duties and taxes are the responsibility of the recipient.
          </p>
          <div className="border border-border-subtle">
            <div className="grid grid-cols-3 px-4 py-3 bg-grip/40 border-b border-border-subtle">
              {["Zone", "Estimated Time", "Notes"].map((h) => (
                <span key={h} className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>
            {internationalZones.map((zone, i) => (
              <div
                key={zone.zone}
                className={`grid grid-cols-3 px-4 py-4 items-center ${i < internationalZones.length - 1 ? "border-b border-border-subtle" : ""}`}
              >
                <span className="text-sm font-semibold text-foreground">{zone.zone}</span>
                <span className="font-mono-tech text-[11px] text-primary">{zone.time}</span>
                <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">{zone.notes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Order Cutoff Times",
              body: "Orders placed before 2:00 PM PST on business days are dispatched the same day. Orders placed after 2:00 PM or on weekends ship the next business day.",
            },
            {
              title: "Fragile & Oversized Items",
              body: "Large or fragile equipment (tripods, lighting kits, cinema cameras) may incur additional handling charges and require signature on delivery.",
            },
            {
              title: "Tracking Your Order",
              body: "You'll receive a tracking number via email as soon as your order ships. Real-time tracking is available through the carrier's website.",
            },
            {
              title: "Lost or Damaged Shipments",
              body: "If your order arrives damaged or is lost in transit, contact us within 72 hours and we'll open a claim and arrange a replacement or refund.",
            },
          ].map((item) => (
            <div key={item.title} className="border border-border-subtle p-6 bg-grip/20">
              <h3 className="font-semibold text-foreground text-sm mb-3">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="border border-border-subtle p-6 bg-grip/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Have a shipping question?</p>
            <p className="text-sm text-muted-foreground">Our support team is available Mon–Sat, 9AM–6PM PST.</p>
          </div>
          <Link
            to={tp("/contact")}
            className="shrink-0 h-11 px-6 bg-foreground text-background font-bold uppercase tracking-widest text-xs flex items-center hover:bg-primary transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Shipping;
