import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, StorefrontSettings, type CompanySettings } from "@/lib/api";

export type SiteLayout = "tech_grid" | "magazine" | "minimal" | "showcase" | "bold" | "boutique";

interface LayoutContextType {
  layout: SiteLayout;
  logo: string;
  companyName: string;
  company: CompanySettings | null;
  storefrontSettings: StorefrontSettings;
  loading: boolean;
  refreshLayout: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
  layout: "tech_grid",
  logo: "",
  companyName: "",
  company: null,
  storefrontSettings: {},
  loading: true,
  refreshLayout: () => {},
});

function applyBrandColors(start: string, mid: string, end: string) {
  const root = document.documentElement;
  root.style.setProperty("--brand-start", start);
  root.style.setProperty("--brand-mid", mid);
  root.style.setProperty("--brand-end", end);
}

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<SiteLayout>("tech_grid");
  const [logo, setLogo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [storefrontSettings, setStorefrontSettings] = useState<StorefrontSettings>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Prevent fetching default data if we are on a tenant route but haven't loaded the schema yet.
    // TenantContext will call refreshLayout() once the schema is ready.
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const isTenantRoute = pathParts.length > 0 && pathParts[0] !== "portal";
    const hasSchema = !!sessionStorage.getItem("tenant_schema_name");
    if (isTenantRoute && !hasSchema && tick === 0) return;

    setLoading(true);
    api.company.get()
      .then((data) => {
        setCompany(data || null);
        if (data?.site_layout) setLayout(data.site_layout as SiteLayout);
        if (data?.logo) setLogo(data.logo);
        if (data?.name) setCompanyName(data.name);
        setStorefrontSettings(data?.storefront_settings || {});
        applyBrandColors(
          data?.brand_color_start || "#004A99",
          data?.brand_color_mid  || "#008B8B",
          data?.brand_color_end  || "#32CD32"
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tick]);

  const refreshLayout = () => setTick(t => t + 1);

  return (
    <LayoutContext.Provider value={{ layout, logo, companyName, company, storefrontSettings, loading, refreshLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
