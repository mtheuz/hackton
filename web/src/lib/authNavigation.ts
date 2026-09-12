import type { UserRole } from '../types/user';

export const ROLE_HOME: Record<UserRole, string> = {
  student: '/aluno',
  teacher: '/professor',
  school_admin: '/escola',
};

// Only resume an internal destination belonging to the authenticated role.
export function destinationAfterLogin(role: UserRole, from: unknown): string {
  if (typeof from === 'string') {
    const home = ROLE_HOME[role];
    if (from === home || from.startsWith(`${home}?`)) return from;
  }
  return ROLE_HOME[role];
}
