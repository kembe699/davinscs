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

  // Force dark mode on mount and ignore any old light mode settings
  useEffect(() => {
    applyTheme("dark");
    setThemeState("dark");
    localStorage.setItem("app_theme", "dark");
  }, []);

  const setTheme = useCallback(async (t: Theme) => {
    // Force dark mode ALWAYS
    applyTheme("dark");
    setThemeState("dark");
    localStorage.setItem("app_theme", "dark");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "dark", setTheme, saving: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
