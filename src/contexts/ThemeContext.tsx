import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type Theme = "dark" | "light";
export type ThemeSection = "admin" | "pos";

// Admin and POS are fully independent theme scopes on purpose — each has its own
// default and its own persisted preference, and switching one never touches the
// other. Only one of the two is ever mounted at a time (they're different routes),
// so whichever section's layout is currently on screen is the one that applies its
// own theme to the DOM — see the `apply` effect in useTheme below.
const SECTION_DEFAULTS: Record<ThemeSection, Theme> = { admin: "dark", pos: "light" };

interface ThemeContextValue {
  adminTheme: Theme;
  posTheme: Theme;
  setAdminTheme: (t: Theme) => void;
  setPosTheme: (t: Theme) => void;
  saving: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const getThemeKey = useCallback((section: ThemeSection) => {
    return user ? `app_theme_${section}_${user.id}` : `app_theme_${section}`;
  }, [user]);

  const [adminTheme, setAdminThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("app_theme_admin") as Theme) || SECTION_DEFAULTS.admin;
  });
  const [posTheme, setPosThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("app_theme_pos") as Theme) || SECTION_DEFAULTS.pos;
  });

  const [saving] = useState(false);

  // Sync both themes from localStorage when user changes (login/logout)
  useEffect(() => {
    setAdminThemeState((localStorage.getItem(getThemeKey("admin")) as Theme) || SECTION_DEFAULTS.admin);
    setPosThemeState((localStorage.getItem(getThemeKey("pos")) as Theme) || SECTION_DEFAULTS.pos);
  }, [getThemeKey]);

  const setAdminTheme = useCallback((t: Theme) => {
    setAdminThemeState(t);
    localStorage.setItem(getThemeKey("admin"), t);
  }, [getThemeKey]);

  const setPosTheme = useCallback((t: Theme) => {
    setPosThemeState(t);
    localStorage.setItem(getThemeKey("pos"), t);
  }, [getThemeKey]);

  return (
    <ThemeContext.Provider value={{ adminTheme, posTheme, setAdminTheme, setPosTheme, saving }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Pass which section is calling — index.html hardcodes data-theme="dark" and nothing
// else updates it or the Tailwind `dark` class (darkMode: ["class"]) on its own, so
// this applies the calling section's own theme to document.documentElement (not a
// local wrapper div — dialogs/dropdowns/sheets portal straight to document.body and
// need the same attribute/class to pick up the right theme). Safe across the two
// scopes because only one section's layout is ever mounted at a time.
export function useTheme(section: ThemeSection) {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  const theme = section === "admin" ? ctx.adminTheme : ctx.posTheme;
  const setTheme = section === "admin" ? ctx.setAdminTheme : ctx.setPosTheme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return { theme, setTheme, saving: ctx.saving };
}
