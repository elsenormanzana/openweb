import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type UserRole } from "@/lib/auth";

export function RequireAuth({ children, roles = [], globalOnly = false }: { children: React.ReactNode; roles?: UserRole[]; globalOnly?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles.length > 0 && !roles.includes(user.role)) return <Navigate to="/admin" replace />;
  if (globalOnly && user.siteId != null) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
