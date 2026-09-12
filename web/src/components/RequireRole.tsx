import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_HOME } from '../lib/authNavigation';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types/user';

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'loading') return <p role="status" className="flex min-h-svh items-center justify-center text-sm text-ink-500">Preparando sua conta…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user.role !== role) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <>{children}</>;
}
