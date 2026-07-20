import { useState, useEffect } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Upload, Save } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";
import { useLayout } from "@/contexts/LayoutContext";

export default function Company() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { refreshLayout } = useLayout();
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
    description: "",
    currency: "UGX",
    brand_color_start: "#004A99",
    brand_color_mid: "#008B8B",
    brand_color_end: "#32CD32",
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

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
          address: data.address || "",
          city: data.city || "",
          country: data.country || "",
          postal_code: data.postal_code || "",
          tax_id: data.tax_id || "",
          website: data.website || "",
          description: data.description || "",
          currency: data.currency || "UGX",
          brand_color_start: data.brand_color_start || "#004A99",
          brand_color_mid: data.brand_color_mid || "#008B8B",
          brand_color_end: data.brand_color_end || "#32CD32",
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
        address: savedData.address || "",
        city: savedData.city || "",
        country: savedData.country || "",
        postal_code: savedData.postal_code || "",
        tax_id: savedData.tax_id || "",
        website: savedData.website || "",
        description: savedData.description || "",
        currency: savedData.currency || "UGX",
        brand_color_start: start,
        brand_color_mid: mid,
        brand_color_end: end,
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

  return (
    <AdminLayout>
      <div className="w-full">
        <div className="px-6 pt-6 pb-0">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Settings</p>
          <h1 className="text-2xl font-bold text-foreground mb-4">My Company</h1>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
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

          {/* Row 2: Address + Additional */}
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
              <div>
                <label className="block text-sm text-foreground mb-2">Currency</label>
                <select value={companyData.currency} onChange={(e) => setCompanyData({ ...companyData, currency: e.target.value })} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary">
                  <option value="UGX">UGX - Ugandan Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="RWF">RWF - Rwandan Franc</option>
                </select>
              </div>
            </div>
          </div>
          <div className="border-b border-border-subtle bg-chassis p-6">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Additional Information</h2>
            <label className="block text-sm text-foreground mb-2">Company Description</label>
            <textarea value={companyData.description} onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })} rows={6} className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary resize-none" placeholder="Brief description of your company..." />
          </div>

          {/* Brand Colors */}
          <div className="border-b border-border-subtle bg-chassis p-6">
            <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-1">Brand Colors</h2>
            <p className="text-xs text-muted-foreground mb-5">Controls the gradient used on buttons, active states, and accent text across the admin panel and POS.</p>

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

          {/* Save Button */}
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
