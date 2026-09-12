import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { AuthUser, UserRole } from '../types/user';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<AuthUser> {
  const { data: profile, error } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return {
    id: userId,
    role: profile.role as UserRole,
    name: profile.name as string,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  init: async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) {
      set({ user: null, status: 'unauthenticated' });
      return;
    }
    try {
      const authUser = await fetchProfile(userId);
      set({ user: authUser, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const authUser = await fetchProfile(data.user.id);
    set({ user: authUser, status: 'authenticated' });
    return authUser;
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, status: 'unauthenticated' });
  },
}));
