import { createContext, useContext, useState, ReactNode } from "react";

export type User = { id: number; email: string; role: string; role_id?: number | null; role_name?: string | null; permissions?: string[] };
type AuthCtx = {
  user: User | null;
  token: string | null;
  permissions: string[];
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
  hasPermission: (key: string) => boolean;
};

const AuthContext = createContext<AuthCtx>({
  user: null,
  token: null,
  permissions: [],
  login: () => {},
  logout: () => {},
  isAdmin: false,
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("cms_token"));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem("cms_user");
    return u ? JSON.parse(u) : null;
  });

  const permissions: string[] = user?.permissions ?? [];

  const login = (t: string, u: User) => {
    localStorage.setItem("cms_token", t);
    localStorage.setItem("cms_user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("cms_token");
    localStorage.removeItem("cms_user");
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  // Legacy admins (no role_id) or users with all permissions are full admins
  const hasPermission = (key: string) =>
    isAdmin && !user?.role_id ? true : permissions.includes(key);

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, isAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
