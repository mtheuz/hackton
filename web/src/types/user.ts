export type UserRole = 'student' | 'teacher' | 'school_admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
}
