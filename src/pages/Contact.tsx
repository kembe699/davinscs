import { useState, useEffect } from "react";
import { Mail, MapPin, Clock, Phone } from "lucide-react";
import { api, type CompanySettings } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  useEffect(() => {
    api.company.get().then(setCompany).catch(() => {});
  }, []);

  const waNumber = company?.whatsapp || "256792149296";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [
      `Hi ${company?.name || "Davin's Camera Store"}! 👋`,
      "You have a new enquiry via your website:",
      "",
      `👤 Name: ${form.name}`,
      `📧 Email: ${form.email}`,
      `📌 Subject: ${form.subject}`,
      "",
      `💬 Message:\n${form.message}`,
    ];
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(waUrl, "_blank");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 technical-grid opacity-10 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-4">
            SUPPORT_CHANNEL
          </div>
          {company?.logo && (
            <img src={company.logo} alt={company.name} className="h-10 object-contain mb-4" />
          )}
          <h1 className="text-4xl lg:text-6xl font-light tracking-tighter text-foreground mb-4">
            Contact{" "}
            <span className="font-bold text-primary">Us</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[50ch]">
            {company?.description || "Our team of working professionals is ready to help you find the right gear, troubleshoot your setup, or answer any pre-purchase questions."}
          </p>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-6">
                Store Info
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="shrink-0 size-10 border border-border-subtle flex items-center justify-center text-primary">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Address</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {company?.address || "—"}{company?.address && <br />}
                      {[company?.city, company?.country].filter(Boolean).join(", ") || ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 size-10 border border-border-subtle flex items-center justify-center text-primary">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Phone</p>
                    {company?.phone && (
                      <a href={`tel:${company.phone}`} className="text-muted-foreground text-sm hover:text-primary transition-colors">{company.phone}</a>
                    )}
                    <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-1 text-sm text-[#25D366] hover:text-[#1ebe5d] transition-colors font-medium">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L.057 23.273a.75.75 0 0 0 .92.92l5.421-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.36l-.355-.212-3.676.997.977-3.567-.232-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                      +{waNumber} (WhatsApp)
                    </a>
                    <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Mon – Sat, 9AM – 6PM EAT</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 size-10 border border-border-subtle flex items-center justify-center text-primary">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Email</p>
                    {company?.email ? (
                      <a href={`mailto:${company.email}`} className="text-muted-foreground text-sm hover:text-primary transition-colors">{company.email}</a>
                    ) : <p className="text-muted-foreground text-sm">—</p>}
                    <p className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Response within 24 hours</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 size-10 border border-border-subtle flex items-center justify-center text-primary">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Hours</p>
                    <div className="space-y-1">
                      {[
                        { day: "Mon – Fri", hours: "9:00 AM – 6:00 PM" },
                        { day: "Saturday", hours: "10:00 AM – 4:00 PM" },
                        { day: "Sunday", hours: "Closed" },
                      ].map((h) => (
                        <div key={h.day} className="flex justify-between gap-8 text-sm text-muted-foreground">
                          <span>{h.day}</span>
                          <span className="font-mono-tech text-[11px]">{h.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-border-subtle p-6 bg-grip/30">
              <p className="font-mono-tech text-[10px] text-primary tracking-widest uppercase mb-3">Expert on Call</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {company?.name || "Davin's Camera Store"} — every support rep is a working filmmaker or creator. You get advice from someone who's actually used the gear in the field.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="border border-primary/30 bg-primary/5 p-12 flex flex-col items-center text-center gap-4 h-full justify-center">
                <div className="size-12 border border-primary flex items-center justify-center text-primary text-2xl">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-foreground">Message Received</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Thanks for reaching out. A member of our team will get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="font-mono-tech text-[10px] text-primary uppercase tracking-widest hover:underline mt-2"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full h-11 bg-grip border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                      Email Address *
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full h-11 bg-grip border border-border-subtle px-4 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                    Subject *
                  </label>
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full h-11 bg-grip border border-border-subtle px-4 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors appearance-none"
                  >
                    <option value="">Select a topic…</option>
                    <option value="pre-sale">Pre-Sale Question</option>
                    <option value="order">Order Status</option>
                    <option value="shipping">Shipping Inquiry</option>
                    <option value="return">Return / Exchange</option>
                    <option value="warranty">Warranty Claim</option>
                    <option value="technical">Technical Support</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-mono-tech text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help…"
                    className="w-full bg-grip border border-border-subtle px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-14 bg-foreground text-background font-bold uppercase tracking-widest text-sm hover:bg-primary transition-colors"
                >
                  Send Message
                </button>
                <p className="font-mono-tech text-[10px] text-muted-foreground text-center tracking-widest">
                  We'll respond within 24 hours on business days.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
