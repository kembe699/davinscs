import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  saving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [saving, setSaving] = useState(false);

  // Load theme on mount: try API first, fall back to localStorage
  useEffect(() => {
    const local = localStorage.getItem("app_theme") as Theme | null;
    if (local === "light" || local === "dark") {
      applyTheme(local);
      setThemeState(local);
    }
    api.company.get()
      .then((data: any) => {
        const sf = data?.storefront_settings || {};
        const saved = sf.theme as Theme | undefined;
        if (saved === "light" || saved === "dark") {
          applyTheme(saved);
          setThemeState(saved);
          localStorage.setItem("app_theme", saved);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    applyTheme(t);
    setThemeState(t);
    localStorage.setItem("app_theme", t);
    setSaving(true);
    try {
      const data = await api.company.get();
      const sf = { ...(data?.storefront_settings || {}), theme: t };
      await api.company.save({ ...data, storefront_settings: sf });
    } catch (e) {
      console.error("Failed to save theme preference", e);
    } finally {
      setSaving(false);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, saving }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
