import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  saving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const getThemeKey = useCallback(() => {
    return user ? `app_theme_${user.id}` : "app_theme";
  }, [user]);

  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("app_theme") as Theme) || "dark";
  });

  const [saving] = useState(false);

  // Sync theme from localStorage when user changes (login/logout)
  // Does NOT touch document.documentElement — ThemeWrapper handles scoped DOM application
  useEffect(() => {
    const savedTheme = (localStorage.getItem(getThemeKey()) as Theme) || "dark";
    setThemeState(savedTheme);
  }, [getThemeKey]);

  const setTheme = useCallback((t: Theme) => {
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
