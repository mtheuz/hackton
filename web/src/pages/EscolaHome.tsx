import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';

export function EscolaHome() {
  const user = useAuthStore((s) => s.user);

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

      <main className="mx-auto max-w-md p-4 sm:p-6">
        <p className="text-sm text-ink-500">Área da escola</p>
      </main>
    </div>
  );
}
