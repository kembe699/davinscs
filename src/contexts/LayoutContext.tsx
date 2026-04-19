import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type SiteLayout = "tech_grid" | "magazine" | "minimal" | "showcase" | "bold" | "boutique";

interface LayoutContextType {
  layout: SiteLayout;
  logo: string;
  companyName: string;
  loading: boolean;
}

const LayoutContext = createContext<LayoutContextType>({
  layout: "tech_grid",
  logo: "",
  companyName: "",
  loading: true,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.company.get()
      .then((data) => {
        if (data?.site_layout) setLayout(data.site_layout as SiteLayout);
        if (data?.logo) setLogo(data.logo);
        if (data?.name) setCompanyName(data.name);
        applyBrandColors(
          data?.brand_color_start || "#004A99",
          data?.brand_color_mid  || "#008B8B",
          data?.brand_color_end  || "#32CD32"
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <LayoutContext.Provider value={{ layout, logo, companyName, loading }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
