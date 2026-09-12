import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { AuthUser, UserRole } from '../types/user';

interface AuthState {
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const userId = data.user?.id ?? '';

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, name')
      .eq('id', userId)
      .single();
    if (profileError) throw profileError;

    set({
      user: {
        id: userId,
        role: profile.role as UserRole,
        name: profile.name as string,
      },
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
