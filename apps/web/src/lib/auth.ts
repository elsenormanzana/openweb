import { createContext, useContext, useEffect, useState, type ReactNode, createElement } from "react";

export type UserRole = "admin" | "page_developer" | "subscriber" | "blogger" | "blogger_admin";

export type AuthUser = {
  sub: number;
  email: string;
  role: UserRole;
  siteId: number | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("openweb_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json() as Promise<AuthUser>;
      })
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("openweb_token");
        localStorage.removeItem("openweb_user");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, u: AuthUser) => {
    localStorage.setItem("openweb_token", token);
    localStorage.setItem("openweb_user", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("openweb_token");
    localStorage.removeItem("openweb_user");
    setUser(null);
  };

  return createElement(AuthContext.Provider, { value: { user, loading, login, logout } }, children);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function canAccess(user: AuthUser | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
