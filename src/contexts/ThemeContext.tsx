import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

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
  const { user } = useAuth();
  
  const getThemeKey = useCallback(() => {
    return user ? `app_theme_${user.id}` : "app_theme";
  }, [user]);

  const [theme, setThemeState] = useState<Theme>(() => {
    // Initial load will use null user if not available yet, but we will sync it in useEffect
    return (localStorage.getItem("app_theme") as Theme) || "light";
  });

  const [saving, setSaving] = useState(false);

  // Sync theme when user changes (login/logout)
  useEffect(() => {
    const savedTheme = (localStorage.getItem(getThemeKey()) as Theme) || "light";
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, [getThemeKey]);

  const setTheme = useCallback(async (t: Theme) => {
    applyTheme(t);
    setThemeState(t);
    localStorage.setItem(getThemeKey(), t);
  }, [getThemeKey]);

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
