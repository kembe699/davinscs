import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTenantPath } from "@/contexts/TenantContext";

const covered = [
  "Manufacturing defects in materials and workmanship",
  "Electronic component failures under normal use",
  "Premature mechanical failure not caused by user error",
  "Defective batteries that fail to hold charge within the warranty period",
  "Firmware or software issues confirmed to be manufacturer defects",
];

const notCovered = [
  "Physical damage from drops, impacts, or liquid exposure",
  "Damage from unauthorized modification or repair",
  "Normal wear and tear (lens coatings, cosmetic wear)",
  "Damage from using incompatible accessories or power supplies",
  "Theft or loss",
];

const brands = [
  { brand: "Sony", period: "1 Year", type: "Parts & Labor" },
  { brand: "Canon", period: "1 Year", type: "Parts & Labor" },
  { brand: "Blackmagic Design", period: "1 Year", type: "Parts & Labor" },
  { brand: "Nikon", period: "1 Year", type: "Parts & Labor" },
  { brand: "Rode", period: "10 Years", type: "Registered Products" },
  { brand: "Shure", period: "2 Years", type: "Parts & Labor" },
  { brand: "Sennheiser", period: "2 Years", type: "Parts & Labor" },
  { brand: "Aputure", period: "2 Years", type: "Parts & Labor" },
  { brand: "Nanlite", period: "2 Years", type: "Parts & Labor" },
  { brand: "Sigma", period: "3 Years", type: "Authorized Service" },
];

const Warranty = () => {
  const tp = useTenantPath();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            WARRANTY_INFO
          </div>
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
            Warranty{" "}
            <span className="font-bold text-primary">Policy</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
            All products sold at Davin's Camera Store carry the full manufacturer's warranty. As an authorized dealer, we can process warranty claims directly.
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20 space-y-16">

        <div className="border border-primary/30 bg-primary/5 p-6 lg:p-8 flex gap-4 items-start">
          <Shield size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground mb-1">Authorized Dealer — Full Warranty Protected</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Buying from Davin's means your product's manufacturer warranty is fully valid. All our products ship with official receipts to support warranty claims.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-border-subtle p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={18} className="text-primary" />
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">
                What's Covered
              </h2>
            </div>
            <ul className="space-y-3">
              {covered.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-primary shrink-0 mt-0.5">+</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-border-subtle p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle size={18} className="text-muted-foreground" />
              <h2 className="font-mono-tech text-[10px] text-muted-foreground tracking-[0.4em] uppercase">
                Not Covered
              </h2>
            </div>
            <ul className="space-y-3">
              {notCovered.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/50 shrink-0 mt-0.5">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
            Warranty Periods by Brand
          </h2>
          <div className="border border-border-subtle">
            <div className="grid grid-cols-3 px-4 py-3 bg-grip/40 border-b border-border-subtle">
              {["Brand", "Standard Period", "Coverage Type"].map((h) => (
                <span key={h} className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">
                  {h}
                </span>
              ))}
            </div>
            {brands.map((b, i) => (
              <div
                key={b.brand}
                className={`grid grid-cols-3 px-4 py-4 items-center ${i < brands.length - 1 ? "border-b border-border-subtle" : ""}`}
              >
                <span className="text-sm font-semibold text-foreground">{b.brand}</span>
                <span className="font-mono-tech text-[11px] text-primary">{b.period}</span>
                <span className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest">{b.type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border-subtle p-6 lg:p-8 bg-grip/20">
          <div className="flex items-center gap-3 mb-4">
            <Wrench size={18} className="text-primary" />
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase">
              How to Make a Warranty Claim
            </h2>
          </div>
          <ol className="space-y-4">
            {[
              "Contact Davin's support with your order number and a description of the issue.",
              "Our team will diagnose whether the issue qualifies for warranty coverage.",
              "We'll coordinate with the manufacturer's service center on your behalf.",
              "Depending on the brand and issue, the item will be repaired or replaced at no charge.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4 text-sm text-muted-foreground">
                <span className="font-mono-tech text-primary font-bold shrink-0">0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="border border-border-subtle p-6 bg-grip/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Need to make a warranty claim?</p>
            <p className="text-sm text-muted-foreground">We'll handle the process for you.</p>
          </div>
          <Link
            to={tp("/contact")}
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

export default Warranty;
