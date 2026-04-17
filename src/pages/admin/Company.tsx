import { useState, useEffect } from "react";
import { Upload, Save } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { api } from "@/lib/api";

export default function Company() {
  const [companyData, setCompanyData] = useState({
    name: "Davin's Camera Store",
    logo: "/logo.jpeg",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Uganda",
    postal_code: "",
    tax_id: "",
    website: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const data = await api.company.get().catch(() => null);
      if (data) {
        setCompanyData(data);
        setLogoPreview(data.logo);
      }
    } catch (err) {
      console.error("Failed to load company data:", err);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setCompanyData({ ...companyData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.company.save(companyData);
      alert("Company details updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update company details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <p className="font-mono-tech text-[10px] text-primary tracking-[0.4em] uppercase mb-1">Settings</p>
          <h1 className="text-2xl font-bold text-foreground">My Company</h1>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Logo Upload */}
            <div className="lg:col-span-1">
              <div className="border border-border-subtle bg-chassis p-6">
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
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2">Recommended: 500x500px, PNG or JPG</p>
              </div>
            </div>

            {/* Company Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="border border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-foreground mb-2">Company Name *</label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Phone</label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Website</label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Tax ID / Registration Number</label>
                    <input
                      type="text"
                      value={companyData.tax_id}
                      onChange={(e) => setCompanyData({ ...companyData, tax_id: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Address Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-foreground mb-2">Street Address</label>
                    <input
                      type="text"
                      value={companyData.address}
                      onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">City</label>
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Postal Code</label>
                    <input
                      type="text"
                      value={companyData.postal_code}
                      onChange={(e) => setCompanyData({ ...companyData, postal_code: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-foreground mb-2">Country</label>
                    <input
                      type="text"
                      value={companyData.country}
                      onChange={(e) => setCompanyData({ ...companyData, country: e.target.value })}
                      className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border border-border-subtle bg-chassis p-6">
                <h2 className="font-mono-tech text-[10px] text-primary tracking-[0.3em] uppercase mb-4">Additional Information</h2>
                
                <div>
                  <label className="block text-sm text-foreground mb-2">Company Description</label>
                  <textarea
                    value={companyData.description}
                    onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-admin-bg border border-admin-border text-admin-text focus:outline-none focus:border-primary resize-none"
                    placeholder="Brief description of your company..."
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-background font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
