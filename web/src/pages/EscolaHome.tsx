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
        <SchoolInsights signals={signals} loading={loading} />
      </main>
    </div>
  );
}
