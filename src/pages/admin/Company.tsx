import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Upload, Save, Plus, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { api, StorefrontSettings } from "@/lib/api";
import LayoutPicker from "@/components/admin/LayoutPicker";
import { useLayout } from "@/contexts/LayoutContext";

const DEFAULT_STOREFRONT: StorefrontSettings = {
  ticker_bg: "#ffffff",
  ticker_text_color: "#000000",
};

export default function Company() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { refreshLayout } = useLayout();
  const [activeTab, setActiveTab] = useState<"general" | "storefront">("general");
  const [companyData, setCompanyData] = useState({
    name: "",
    logo: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    country: "",
    postal_code: "",
    tax_id: "",
    website: "",
    site_layout: "tech_grid",
    description: "",
    brand_color_start: "#004A99",
    brand_color_mid: "#008B8B",
    brand_color_end: "#32CD32",
    storefront_settings: { ...DEFAULT_STOREFRONT } as StorefrontSettings,
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const setSF = (patch: Partial<StorefrontSettings>) =>
    setCompanyData(prev => ({ ...prev, storefront_settings: { ...prev.storefront_settings, ...patch } }));

  const compressImage = (file: File, maxPx = 400, quality = 0.85): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onloadend = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });

  const setTickerItem = (i: number, val: string) => {
    const items = [...(companyData.storefront_settings.ticker_items || [])];
    items[i] = val;
    setSF({ ticker_items: items });
  };
  const addTickerItem = () => setSF({ ticker_items: [...(companyData.storefront_settings.ticker_items || []), ""] });
  const removeTickerItem = (i: number) => {
    const items = [...(companyData.storefront_settings.ticker_items || [])];
    items.splice(i, 1);
    setSF({ ticker_items: items });
  };

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const data = await api.company.get().catch(() => null);
      if (data) {
        setCompanyData({
          name: data.name || "",
          logo: data.logo || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          site_layout: data.site_layout || "tech_grid",
          address: data.address || "",
          city: data.city || "",
          country: data.country || "",
          postal_code: data.postal_code || "",
          tax_id: data.tax_id || "",
          website: data.website || "",
          description: data.description || "",
          brand_color_start: data.brand_color_start || "#004A99",
          brand_color_mid: data.brand_color_mid || "#008B8B",
          brand_color_end: data.brand_color_end || "#32CD32",
          storefront_settings: { ...DEFAULT_STOREFRONT, ...(data.storefront_settings || {}) },
        });
        setLogoPreview(data.logo || "");
      }
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file).then((dataUrl) => {
      setLogoPreview(dataUrl);
      setCompanyData(prev => ({ ...prev, logo: dataUrl }));
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const savedData = await api.company.save(companyData);
      // Update local state with saved data
      const start = savedData.brand_color_start || "#004A99";
      const mid   = savedData.brand_color_mid   || "#008B8B";
      const end   = savedData.brand_color_end   || "#32CD32";
      document.documentElement.style.setProperty("--brand-start", start);
      document.documentElement.style.setProperty("--brand-mid",   mid);
      document.documentElement.style.setProperty("--brand-end",   end);
      setCompanyData({
        name: savedData.name || "",
        logo: savedData.logo || "",
        email: savedData.email || "",
        phone: savedData.phone || "",
        whatsapp: savedData.whatsapp || "",
        site_layout: savedData.site_layout || "tech_grid",
        address: savedData.address || "",
        city: savedData.city || "",
        country: savedData.country || "",
        postal_code: savedData.postal_code || "",
        tax_id: savedData.tax_id || "",
        website: savedData.website || "",
        description: savedData.description || "",
        brand_color_start: start,
        brand_color_mid: mid,
        brand_color_end: end,
        storefront_settings: { ...DEFAULT_STOREFRONT, ...(savedData.storefront_settings || {}) },
      });
      setLogoPreview(savedData.logo || "");
      refreshLayout();
      toast("Company details updated successfully!", "success", "Saved");
    } catch (err: any) {
      toast(err.message || "Failed to update company details", "error", "Save Failed");
    } finally {
      setLoading(false);
    }
  };

  const sf = companyData.storefront_settings;

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="px-6 pt-6 pb-0">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Settings</p>
          <h1 className="text-2xl font-bold text-foreground mb-4">My Company</h1>
          <div className="flex border-b border-border-subtle">
            {(["general", "storefront"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-mono-tech text-[11px] uppercase tracking-widest border-b-2 transition-colors ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "general" ? "General" : "Storefront Content"}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          {activeTab === "storefront" && (
            <div className="space-y-0">
              {/* Hero Section */}
              <div className="border-b border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Hero Section</h2>
                {/* Hero Image */}
                <div className="mb-6">
                  <label className="field-label mb-2 block">Hero Center Image</label>
                  <div className="flex items-start gap-4">
                    <div className="w-40 h-48 bg-admin-bg border border-admin-border flex items-center justify-center overflow-hidden shrink-0">
                      {sf.hero_image
                        ? <img src={sf.hero_image} alt="Hero" className="w-full h-full object-cover" />
                        : <span className="text-[10px] text-muted-foreground font-mono-tech uppercase">Default photo</span>
                      }
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg cursor-pointer transition-colors">
                        <Upload size={13} /> Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 1200, 0.9).then(url => setSF({ hero_image: url })).catch(() => {}); }} />
                      </label>
                      {sf.hero_image && (
                        <button type="button" onClick={() => setSF({ hero_image: "" })} className="flex items-center gap-2 px-4 py-2 border border-admin-border text-admin-text text-sm hover:bg-admin-bg transition-colors">
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">Replaces the default camera photo.<br/>Recommended: 4:5 portrait ratio.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="field-label">Tagline (small badge text)</label>
                    <input className="field-input" value={sf.hero_tagline || ""} onChange={e => setSF({ hero_tagline: e.target.value })} placeholder="Your Vision / Our Gear" />
                  </div>
                  <div>
                    <label className="field-label">Heading Line 1</label>
                    <input className="field-input" value={sf.hero_heading_1 || ""} onChange={e => setSF({ hero_heading_1: e.target.value })} placeholder="CAPTURE" />
                  </div>
                  <div>
                    <label className="field-label">Heading Line 2 (bold/accent)</label>
                    <input className="field-input" value={sf.hero_heading_2 || ""} onChange={e => setSF({ hero_heading_2: e.target.value })} placeholder="EVERYTHING" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">Sub-text</label>
                    <textarea className="field-input" rows={2} value={sf.hero_subtext || ""} onChange={e => setSF({ hero_subtext: e.target.value })} placeholder="Professional cameras, podcast setups…" />
                  </div>
                  <div>
                    <label className="field-label">Brands Count</label>
                    <input className="field-input" value={sf.hero_brands_count || ""} onChange={e => setSF({ hero_brands_count: e.target.value })} placeholder="50+" />
                  </div>
                  <div>
                    <label className="field-label">Products Count</label>
                    <input className="field-input" value={sf.hero_products_count || ""} onChange={e => setSF({ hero_products_count: e.target.value })} placeholder="2,400+" />
                  </div>
                  <div>
                    <label className="field-label">Badge Line 1 (Auth)</label>
                    <input className="field-input" value={sf.hero_badge_1 || ""} onChange={e => setSF({ hero_badge_1: e.target.value })} placeholder="[AUTH] Authorized dealer…" />
                  </div>
                  <div>
                    <label className="field-label">Badge Line 2 (Shipping)</label>
                    <input className="field-input" value={sf.hero_badge_2 || ""} onChange={e => setSF({ hero_badge_2: e.target.value })} placeholder="[SHIP] Same-day shipping…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">Badge Line 3 (Support)</label>
                    <input className="field-input" value={sf.hero_badge_3 || ""} onChange={e => setSF({ hero_badge_3: e.target.value })} placeholder="[SUPPORT] Expert advice…" />
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="border-b border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">About Section</h2>
                {/* About Image */}
                <div className="mb-6">
                  <label className="field-label mb-2 block">About Section Image</label>
                  <div className="flex items-start gap-4">
                    <div className="w-40 h-40 bg-admin-bg border border-admin-border flex items-center justify-center overflow-hidden shrink-0">
                      {sf.about_image
                        ? <img src={sf.about_image} alt="About" className="w-full h-full object-cover" />
                        : <span className="text-[10px] text-muted-foreground font-mono-tech uppercase">Default photo</span>
                      }
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg cursor-pointer transition-colors">
                        <Upload size={13} /> Upload Image
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) compressImage(f, 1200, 0.9).then(url => setSF({ about_image: url })).catch(() => {}); }} />
                      </label>
                      {sf.about_image && (
                        <button type="button" onClick={() => setSF({ about_image: "" })} className="flex items-center gap-2 px-4 py-2 border border-admin-border text-admin-text text-sm hover:bg-admin-bg transition-colors">
                          <Trash2 size={13} /> Remove
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground">Replaces the default microphone photo.<br/>Recommended: 1:1 square ratio.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Section Tagline</label>
                    <input className="field-input" value={sf.about_tagline || ""} onChange={e => setSF({ about_tagline: e.target.value })} placeholder="About Davin's" />
                  </div>
                  <div>
                    <label className="field-label">Section Heading</label>
                    <input className="field-input" value={sf.about_heading || ""} onChange={e => setSF({ about_heading: e.target.value })} placeholder="Built for the creator…" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="field-label">Body Text</label>
                    <textarea className="field-input" rows={4} value={sf.about_body || ""} onChange={e => setSF({ about_body: e.target.value })} placeholder="We don't just sell equipment…" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Stat 1 Value</label>
                      <input className="field-input" value={sf.about_stat_1_value || ""} onChange={e => setSF({ about_stat_1_value: e.target.value })} placeholder="7+" />
                    </div>
                    <div>
                      <label className="field-label">Stat 1 Label</label>
                      <input className="field-input" value={sf.about_stat_1_label || ""} onChange={e => setSF({ about_stat_1_label: e.target.value })} placeholder="Years" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Stat 2 Value</label>
                      <input className="field-input" value={sf.about_stat_2_value || ""} onChange={e => setSF({ about_stat_2_value: e.target.value })} placeholder="12K+" />
                    </div>
                    <div>
                      <label className="field-label">Stat 2 Label</label>
                      <input className="field-input" value={sf.about_stat_2_label || ""} onChange={e => setSF({ about_stat_2_label: e.target.value })} placeholder="Customers" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Stat 3 Value</label>
                      <input className="field-input" value={sf.about_stat_3_value || ""} onChange={e => setSF({ about_stat_3_value: e.target.value })} placeholder="4.9★" />
                    </div>
                    <div>
                      <label className="field-label">Stat 3 Label</label>
                      <input className="field-input" value={sf.about_stat_3_label || ""} onChange={e => setSF({ about_stat_3_label: e.target.value })} placeholder="Rating" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ticker Banner */}
              <div className="border-b border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Scrolling Ticker Banner</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="field-label">Background Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={sf.ticker_bg || "#ffffff"} onChange={e => setSF({ ticker_bg: e.target.value })} className="w-12 h-10 cursor-pointer bg-transparent border-0 p-0" />
                      <input className="field-input flex-1" value={sf.ticker_bg || "#ffffff"} onChange={e => setSF({ ticker_bg: e.target.value })} placeholder="#ffffff" maxLength={7} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Text Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={sf.ticker_text_color || "#000000"} onChange={e => setSF({ ticker_text_color: e.target.value })} className="w-12 h-10 cursor-pointer bg-transparent border-0 p-0" />
                      <input className="field-input flex-1" value={sf.ticker_text_color || "#000000"} onChange={e => setSF({ ticker_text_color: e.target.value })} placeholder="#000000" maxLength={7} />
                    </div>
                  </div>
                </div>
                {/* Live preview */}
                <div className="w-full py-2 mb-6 overflow-hidden border border-border-subtle" style={{ background: sf.ticker_bg || "#ffffff" }}>
                  <div className="flex gap-12 px-6">
                    {(sf.ticker_items || []).map((item, i) => (
                      <span key={i} className="font-bold text-[10px] tracking-widest uppercase whitespace-nowrap" style={{ color: sf.ticker_text_color || "#000000" }}>{item || "…"}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {(sf.ticker_items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="field-input flex-1"
                        value={item}
                        onChange={e => setTickerItem(i, e.target.value)}
                        placeholder={`Ticker item ${i + 1}`}
                      />
                      <button type="button" onClick={() => removeTickerItem(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addTickerItem} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
                    <Plus size={13} /> Add item
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <>
          {/* Row 1: Logo + Basic Information — 50/50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="border-b border-r border-border-subtle bg-chassis p-6">
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Company Logo</h2>
              <div className="mb-4">
                {logoPreview ? (
                  <div className="w-full h-48 bg-admin-bg border border-admin-border rounded flex items-center justify-center overflow-hidden">
                    <img src={logoPreview} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-admin-bg border border-admin-border rounded flex items-center justify-center">
                    <Upload size={32} className="text-admin-text-secondary" />
                  </div>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 px-4 py-2 bg-admin-surface border border-admin-border text-admin-text text-sm hover:bg-admin-bg cursor-pointer transition-colors">
                <Upload size={14} />
                Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
              <p className="text-xs text-muted-foreground mt-2">Recommended: 500x500px, PNG or JPG</p>
            </div>

            <div className="border-b border-border-subtle bg-chassis p-6">
              <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-foreground mb-2">Company Name *</label>
                  <input type="text" value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} required className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">Email</label>
                  <input type="email" value={companyData.email} onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">Phone</label>
                  <input type="tel" value={companyData.phone} onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">Website</label>
                  <input type="url" value={companyData.website} onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">WhatsApp Number</label>
                  <input type="tel" value={companyData.whatsapp} onChange={(e) => setCompanyData({ ...companyData, whatsapp: e.target.value })} placeholder="e.g. 256792149296" className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                  <p className="text-xs text-muted-foreground mt-1">Include country code, no + sign.</p>
                </div>
                <div>
                  <label className="block text-sm text-foreground mb-2">Tax ID / Registration Number</label>
                  <input type="text" value={companyData.tax_id} onChange={(e) => setCompanyData({ ...companyData, tax_id: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Address + Additional (left) | Website Layout (right) — 50/50 */}
          <div className="grid grid-cols-1 xl:grid-cols-2">
            <div className="space-y-0 border-r border-border-subtle">
              <div className="border-b border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Address Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-foreground mb-2">Street Address</label>
                    <input type="text" value={companyData.address} onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-2">City</label>
                    <input type="text" value={companyData.city} onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-2">Postal Code</label>
                    <input type="text" value={companyData.postal_code} onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm text-foreground mb-2">Country</label>
                    <input type="text" value={companyData.country} onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary" />
                  </div>
                </div>
              </div>
              <div className="border-b border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Additional Information</h2>
                <label className="block text-sm text-foreground mb-2">Company Description</label>
                <textarea value={companyData.description} onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })} rows={6} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary resize-none" placeholder="Brief description of your company..." />
              </div>
            </div>
            <div className="p-4 sm:p-6 bg-chassis border-b border-border-subtle">
              <LayoutPicker value={companyData.site_layout} onChange={(key) => setCompanyData({ ...companyData, site_layout: key })} />
            </div>
          </div>

          {/* Row 3: Brand Colors */}
          <div className="border-b border-border-subtle bg-chassis p-6">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-1">Brand Colors</h2>
            <p className="text-xs text-muted-foreground mb-5">Controls the gradient used on buttons, active states, and accent text across the entire website.</p>

            {/* Live gradient preview bar */}
            <div
              className="w-full h-8 mb-6 border border-border-subtle"
              style={{ background: `linear-gradient(90deg, ${companyData.brand_color_start} 0%, ${companyData.brand_color_mid} 50%, ${companyData.brand_color_end} 100%)` }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-foreground mb-2">Gradient Start</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={companyData.brand_color_start}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-start", val);
                      setCompanyData({ ...companyData, brand_color_start: val });
                    }}
                    className="w-12 h-10 cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={companyData.brand_color_start}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-start", val);
                      setCompanyData({ ...companyData, brand_color_start: val });
                    }}
                    className="flex-1 px-3 py-2 bg-admin-bg border border-admin-border text-admin-text font-mono text-sm focus:outline-none focus:border-primary uppercase"
                    maxLength={7}
                    placeholder="#004A99"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Gradient Mid</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={companyData.brand_color_mid}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-mid", val);
                      setCompanyData({ ...companyData, brand_color_mid: val });
                    }}
                    className="w-12 h-10 cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={companyData.brand_color_mid}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-mid", val);
                      setCompanyData({ ...companyData, brand_color_mid: val });
                    }}
                    className="flex-1 px-3 py-2 bg-admin-bg border border-admin-border text-admin-text font-mono text-sm focus:outline-none focus:border-primary uppercase"
                    maxLength={7}
                    placeholder="#008B8B"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-foreground mb-2">Gradient End</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={companyData.brand_color_end}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-end", val);
                      setCompanyData({ ...companyData, brand_color_end: val });
                    }}
                    className="w-12 h-10 cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={companyData.brand_color_end}
                    onChange={(e) => {
                      const val = e.target.value;
                      document.documentElement.style.setProperty("--brand-end", val);
                      setCompanyData({ ...companyData, brand_color_end: val });
                    }}
                    className="flex-1 px-3 py-2 bg-admin-bg border border-admin-border text-admin-text font-mono text-sm focus:outline-none focus:border-primary uppercase"
                    maxLength={7}
                    placeholder="#32CD32"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="border-b border-border-subtle bg-chassis p-6">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Appearance</h2>
            <p className="text-sm text-admin-text-secondary mb-4">Choose the interface colour scheme for the admin panel and POS.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 px-5 py-3 border text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-admin-text text-admin-bg border-admin-text"
                    : "bg-admin-bg border-admin-border text-admin-text-secondary hover:text-admin-text"
                }`}
              >
                <Moon size={14} />
                Dark Mode
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 px-5 py-3 border text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "bg-admin-text text-admin-bg border-admin-text"
                    : "bg-admin-bg border-admin-border text-admin-text-secondary hover:text-admin-text"
                }`}
              >
                <Sun size={14} />
                Light Mode
              </button>
            </div>
            <p className="font-mono-tech text-[9px] text-admin-text-secondary uppercase tracking-widest mt-3">
              Active: {theme === "dark" ? "Dark" : "Light"} — saved automatically
            </p>
          </div>
            </>
          )}

          {/* Save Button — always visible */}
          <div className="flex justify-end px-6 py-4 border-t border-border-subtle">
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50">
              <Save size={16} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
