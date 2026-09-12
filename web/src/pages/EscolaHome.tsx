import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useSchoolInsights } from '../hooks/useSchoolInsights';
import { SchoolInsights } from '../components/SchoolInsights';

export function EscolaHome() {
  const user = useAuthStore((s) => s.user);
  const { signals, loading } = useSchoolInsights();

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user?.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
        <section className="mt-6 rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
            Painel da Escola
          </span>
          <h2 className="mt-1 text-base font-bold text-ink-700">Visão agregada da rede</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Sinais de bem-estar e engajamento das turmas, sempre agregados e anonimizados.
          </p>
        </section>

        <SchoolInsights signals={signals} loading={loading} />
      </main>
    </div>
  );
}
