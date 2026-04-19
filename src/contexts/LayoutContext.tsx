import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type SiteLayout = "tech_grid" | "magazine" | "minimal" | "showcase" | "bold" | "boutique";

interface LayoutContextType {
  layout: SiteLayout;
  loading: boolean;
}

const LayoutContext = createContext<LayoutContextType>({ layout: "tech_grid", loading: true });

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<SiteLayout>("tech_grid");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.company.get()
      .then((data) => {
        if (data?.site_layout) setLayout(data.site_layout as SiteLayout);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <LayoutContext.Provider value={{ layout, loading }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
