import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types/user';

const ROLE_HOME: Record<UserRole, string> = {
  student: '/aluno',
  teacher: '/professor',
  school_admin: '/escola',
};

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signIn(email, password);
      navigate(ROLE_HOME[user.role], { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-canvas p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src="/logo.png"
            alt="Fokido Logo"
            className="h-28 w-auto object-contain transition-transform duration-300 hover:scale-105"
          />
          <p className="mt-2 text-sm text-ink-500">
            Acesse sua conta na plataforma educacional
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-4 rounded-2xl border border-line-200 bg-surface p-6 shadow-sm transition-all duration-200 hover:shadow-md sm:p-8"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="seu.email@escola.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-lg border border-[#dddddd] bg-[#fafafa] px-3.5 py-2.5 text-sm text-black outline-none transition-all duration-200 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-semibold text-ink-700">
                Senha
              </label>
            </div>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-lg border border-[#dddddd] bg-[#fafafa] px-3.5 py-2.5 text-sm text-black outline-none transition-all duration-200 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger-50 bg-danger-50 p-3 text-xs font-medium text-danger-600">
              <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 hover:shadow active:bg-brand-800 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink-300">
          &copy; {new Date().getFullYear()} Fokido. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}

