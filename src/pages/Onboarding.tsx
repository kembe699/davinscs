import { useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useTenant } from "../contexts/TenantContext.tsx";
import {
  Building2, User, Palette, Rocket, ChevronRight, ChevronLeft,
  Upload, Eye, EyeOff, Check, Store, ShoppingBag, Utensils,
  Stethoscope, BookOpen, Wrench, MoreHorizontal, Camera,
  Trash2, Globe, Phone, Mail, MapPin, FileText, Hash,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 – Business type
  business_type: string;
  // Step 2 – Business info
  company_name: string;
  tagline: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tax_id: string;
  whatsapp: string;
  // Step 2 – Currency
  secondary_currency: string;
  // Step 3 – Branding
  logo: string;
  brand_color_start: string;
  brand_color_mid: string;
  brand_color_end: string;
  site_layout: string;
  // Step 4 – Admin user
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_confirm: string;
}

// Common secondary currencies
const CURRENCY_OPTIONS = [
  { code: "", name: "None (USD only)", symbol: "" },
  { code: "SSP", name: "South Sudanese Pound (SSP)", symbol: "SSP" },
  { code: "UGX", name: "Ugandan Shilling (UGX)", symbol: "UGX" },
  { code: "KES", name: "Kenyan Shilling (KES)", symbol: "KES" },
  { code: "TZS", name: "Tanzanian Shilling (TZS)", symbol: "TZS" },
  { code: "EUR", name: "Euro (EUR)", symbol: "€" },
  { code: "GBP", name: "British Pound (GBP)", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira (NGN)", symbol: "₦" },
  { code: "ZAR", name: "South African Rand (ZAR)", symbol: "R" },
  { code: "GHS", name: "Ghanaian Cedi (GHS)", symbol: "GH₵" },
  { code: "ETB", name: "Ethiopian Birr (ETB)", symbol: "ETB" },
  { code: "RWF", name: "Rwandan Franc (RWF)", symbol: "RWF" },
  { code: "ZMW", name: "Zambian Kwacha (ZMW)", symbol: "ZMW" },
  { code: "XAF", name: "CFA Franc BEAC (XAF)", symbol: "XAF" },
  { code: "INR", name: "Indian Rupee (INR)", symbol: "₹" },
  { code: "CNY", name: "Chinese Yuan (CNY)", symbol: "¥" },
  { code: "AED", name: "UAE Dirham (AED)", symbol: "AED" },
];

const BUSINESS_TYPES = [
  { id: "retail", label: "Retail Store", icon: Store },
  { id: "electronics", label: "Electronics", icon: Camera },
  { id: "fashion", label: "Fashion & Apparel", icon: ShoppingBag },
  { id: "food", label: "Food & Beverage", icon: Utensils },
  { id: "pharmacy", label: "Pharmacy / Health", icon: Stethoscope },
  { id: "education", label: "Education", icon: BookOpen },
  { id: "services", label: "Services / Repairs", icon: Wrench },
  { id: "other", label: "Other", icon: MoreHorizontal },
];

const LAYOUTS = [
  { id: "tech_grid", label: "Tech Grid", desc: "Bold grid, great for electronics" },
  { id: "boutique", label: "Boutique", desc: "Elegant, fashion-forward" },
  { id: "minimal", label: "Minimal", desc: "Clean and uncluttered" },
  { id: "magazine", label: "Magazine", desc: "Content-rich editorial" },
  { id: "showcase", label: "Showcase", desc: "Hero-focused, visual" },
  { id: "bold", label: "Bold", desc: "High contrast, impactful" },
];

const STEPS = [
  { id: 1, label: "Business Type", icon: Building2 },
  { id: 2, label: "Business Info", icon: Store },
  { id: 3, label: "Branding", icon: Palette },
  { id: 4, label: "Admin Account", icon: User },
  { id: 5, label: "All Set!", icon: Rocket },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const tenant = useTenant();
  const schemaName = tenant.schemaName;
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<FormData>({
    business_type: "",
    company_name: "",
    tagline: "",
    address: "",
    city: "",
    country: "South Sudan",
    phone: "",
    email: "",
    website: "",
    tax_id: "",
    whatsapp: "",
    secondary_currency: "",
    logo: "",
    brand_color_start: "#004A99",
    brand_color_mid: "#008B8B",
    brand_color_end: "#32CD32",
    site_layout: "tech_grid",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    admin_confirm: "",
  });

  const set = (key: keyof FormData, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const readLogo = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => set("logo", reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Validation ───────────────────────────────────────────────────────────────

  const canAdvance = (): boolean => {
    if (step === 1) return !!form.business_type;
    if (step === 2) return !!form.company_name.trim();
    if (step === 3) return true;
    if (step === 4) {
      return (
        !!form.admin_email.trim() &&
        form.admin_password.length >= 8 &&
        form.admin_password === form.admin_confirm
      );
    }
    return true;
  };

  const stepError = (): string => {
    if (step === 4) {
      if (!form.admin_email.trim()) return "Admin email is required";
      if (form.admin_password.length < 8) return "Password must be at least 8 characters";
      if (form.admin_password !== form.admin_confirm) return "Passwords do not match";
    }
    return "";
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const validationError = stepError();
    if (validationError) { setError(validationError); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_name: schemaName,
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: form.admin_password,
          company_name: form.company_name,
          business_type: form.business_type,
          address: form.address,
          city: form.city,
          country: form.country,
          phone: form.phone,
          email: form.email,
          website: form.website,
          tax_id: form.tax_id,
          whatsapp: form.whatsapp,
          logo: form.logo,
          brand_color_start: form.brand_color_start,
          brand_color_mid: form.brand_color_mid,
          brand_color_end: form.brand_color_end,
          site_layout: form.site_layout,
          tagline: form.tagline,
          secondary_currency: form.secondary_currency || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed");
      setStep(5);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    const validationError = stepError();
    if (validationError) { setError(validationError); return; }
    setError("");
    if (step === 4) { handleSubmit(); return; }
    setStep((s) => s + 1);
  };

  const back = () => { setError(""); setStep((s) => s - 1); };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* Progress bar */}
      {step < 5 && (
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.slice(0, 4).map((s, i) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={`flex flex-col items-center gap-1`}>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${done ? "bg-emerald-500 border-emerald-500" : active ? "bg-blue-600 border-blue-500" : "bg-slate-700 border-slate-600"}`}>
                      {done
                        ? <Check size={16} className="text-white" />
                        : <Icon size={16} className={active ? "text-white" : "text-slate-400"} />}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${active ? "text-blue-400" : done ? "text-emerald-400" : "text-slate-500"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div className={`flex-1 h-[2px] mx-2 rounded transition-all duration-500
                      ${step > s.id ? "bg-emerald-500" : "bg-slate-700"}`} style={{ width: "3rem" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Step 1: Business Type ── */}
        {step === 1 && (
          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600/20 border border-blue-500/30 mb-4">
                <Rocket size={26} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome! Let's get you set up.</h1>
              <p className="text-slate-400 text-sm">Tell us about your business so we can tailor the system for you.</p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">What type of business do you run?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BUSINESS_TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("business_type", id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-sm font-medium
                    ${form.business_type === id
                      ? "border-blue-500 bg-blue-600/20 text-blue-300"
                      : "border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700"
                    }`}
                >
                  <Icon size={22} />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Business Info ── */}
        {step === 2 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Business Information</h2>
              <p className="text-slate-400 text-sm">This appears on receipts, invoices, and your storefront.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. FlippedPos"
                    value={form.company_name}
                    onChange={(e) => set("company_name", e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Tagline / Slogan</label>
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Your Vision / Our Gear"
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                  />
                </div>
                <Field icon={Phone} label="Phone" placeholder="+211 92 000 0000" value={form.phone} onChange={(v) => set("phone", v)} />
                <Field icon={Mail} label="Email" placeholder="info@yourbusiness.com" value={form.email} onChange={(v) => set("email", v)} />
                <Field icon={MapPin} label="Address" placeholder="Street address" value={form.address} onChange={(v) => set("address", v)} />
                <Field icon={MapPin} label="City" placeholder="Juba" value={form.city} onChange={(v) => set("city", v)} />
                <Field icon={Globe} label="Country" placeholder="South Sudan" value={form.country} onChange={(v) => set("country", v)} />
                <Field icon={Globe} label="Website" placeholder="https://yourbusiness.com" value={form.website} onChange={(v) => set("website", v)} />
                <Field icon={Hash} label="Tax / TIN Number" placeholder="Optional" value={form.tax_id} onChange={(v) => set("tax_id", v)} />
                <Field icon={Phone} label="WhatsApp" placeholder="+211 92 000 0000" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
              </div>

              {/* Currency */}
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Currency Settings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Primary Currency</label>
                    <div className="w-full bg-slate-600/50 border border-slate-600 rounded-lg px-3 py-2.5 text-slate-300 text-sm flex items-center gap-2">
                      <span className="text-lg">$</span>
                      <span>USD — US Dollar</span>
                      <span className="ml-auto text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">Default</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">USD is the system base currency.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Secondary Currency <span className="text-slate-500 normal-case">(optional)</span></label>
                    <select
                      value={form.secondary_currency}
                      onChange={(e) => set("secondary_currency", e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      {CURRENCY_OPTIONS.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Can be changed later in Settings → Currencies.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Branding ── */}
        {step === 3 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Brand & Appearance</h2>
              <p className="text-slate-400 text-sm">Upload your logo and choose your brand colors and storefront style.</p>
            </div>
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Logo</label>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                    {form.logo
                      ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                      : <Camera size={24} className="text-slate-500" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      <Upload size={14} /> Upload Logo
                    </button>
                    {form.logo && (
                      <button
                        type="button"
                        onClick={() => set("logo", "")}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                    <p className="text-xs text-slate-500">PNG, SVG, or JPG. Square preferred.</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) readLogo(f); }}
                    />
                  </div>
                </div>
              </div>

              {/* Brand Colors */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Brand Gradient Colors</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    ["brand_color_start", "Primary"],
                    ["brand_color_mid", "Secondary"],
                    ["brand_color_end", "Accent"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-400">{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form[key]}
                          onChange={(e) => set(key, e.target.value)}
                          className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-slate-400">{form[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Preview bar */}
                <div
                  className="mt-3 h-3 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${form.brand_color_start}, ${form.brand_color_mid}, ${form.brand_color_end})` }}
                />
              </div>

              {/* Site Layout */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Storefront Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LAYOUTS.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set("site_layout", id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all duration-200
                        ${form.site_layout === id
                          ? "border-blue-500 bg-blue-600/20"
                          : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                        }`}
                    >
                      <div className={`text-sm font-semibold mb-0.5 ${form.site_layout === id ? "text-blue-300" : "text-slate-200"}`}>{label}</div>
                      <div className="text-xs text-slate-500 leading-snug">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Admin Account ── */}
        {step === 4 && (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Create Your Admin Account</h2>
              <p className="text-slate-400 text-sm">This is the owner / super-admin login. You can add more users later.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Your Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. James Deng"
                    value={form.admin_name}
                    onChange={(e) => set("admin_name", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="admin@yourbusiness.com"
                    value={form.admin_email}
                    onChange={(e) => set("admin_email", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pr-10"
                    placeholder="Min. 8 characters"
                    value={form.admin_password}
                    onChange={(e) => set("admin_password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.admin_password && (
                  <PasswordStrength password={form.admin_password} />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className={`w-full bg-slate-700 border rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 pr-10
                      ${form.admin_confirm && form.admin_confirm !== form.admin_password
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-600 focus:border-blue-500 focus:ring-blue-500"}`}
                    placeholder="Repeat password"
                    value={form.admin_confirm}
                    onChange={(e) => set("admin_confirm", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.admin_confirm && form.admin_password !== form.admin_confirm && (
                  <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                )}
                {form.admin_confirm && form.admin_password === form.admin_confirm && (
                  <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1"><Check size={11} /> Passwords match</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: All Done ── */}
        {step === 5 && (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <Check size={36} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">You're all set, {form.admin_name || "Admin"}!</h2>
              <p className="text-slate-400 max-w-md">
                <strong className="text-white">{form.company_name}</strong> has been configured successfully.
                Log in with your admin credentials to get started.
              </p>
            </div>

            <div className="bg-slate-700/60 border border-slate-600 rounded-xl p-5 mb-8 text-left max-w-sm mx-auto">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Your login details</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white font-mono">{form.admin_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password</span>
                  <span className="text-slate-300">••••••••</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { window.location.href = `/${tenantSlug}/admin/login`; }}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <Rocket size={16} /> Go to Admin Login
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mx-8 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Footer nav ── */}
        {step < 5 && (
          <div className="px-8 pb-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance() || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors ml-auto"
            >
              {loading
                ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4" />
                : null}
              {step === 4 ? "Complete Setup" : "Continue"}
              {!loading && <ChevronRight size={15} />}
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-600">Powered by <span className="text-slate-500 font-semibold">FlippedPos</span></p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
      <div className="relative">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const has8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [has8, hasUpper, hasNum, hasSpecial].filter(Boolean).length;

  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : "bg-slate-600"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score >= 3 ? "text-emerald-400" : score >= 2 ? "text-yellow-400" : "text-red-400"}`}>
        {labels[Math.max(0, score - 1)]} password
      </p>
    </div>
  );
}
