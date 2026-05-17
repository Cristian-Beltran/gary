import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "./useAuth";
import type { UserType } from "./auth.interface";

interface RequireRoleProps {
  allow: UserType[];
  children: ReactNode;
}

export function RequireRole({ allow, children }: RequireRoleProps) {
  const { user } = useAuthStore();

  if (!user?.type) {
    return <Navigate to="/login" replace />;
  }

  const role = user.type.toLowerCase() as UserType;

  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
