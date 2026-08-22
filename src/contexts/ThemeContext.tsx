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
  useEffect(() => {
    const savedTheme = (localStorage.getItem(getThemeKey()) as Theme) || "dark";
    setThemeState(savedTheme);
  }, [getThemeKey]);

  // index.html hardcodes data-theme="dark" and nothing else ever updated it or the
  // Tailwind `dark` class (darkMode: ["class"]) — so toggling theme only ever changed
  // this context's own state, with no visible effect anywhere. This is the one place
  // that actually applies it to the DOM for both the CSS-variable theme (data-theme)
  // and every component's `dark:` Tailwind utility classes.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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
