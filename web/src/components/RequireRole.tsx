import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types/user';

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  if (status === 'loading') return null;
  if (!user || user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
