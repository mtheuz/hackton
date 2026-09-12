import { useAuthStore } from '../store/useAuthStore';
import { useInterceptaMission } from '../hooks/useInterceptaMission';
import { useDomainProgress } from '../hooks/useDomainProgress';
import { useMoodCheckins } from '../hooks/useMoodCheckins';
import { InterceptaCard } from '../components/InterceptaCard';
import { CheckinHumor } from '../components/CheckinHumor';

export function AlunoHome() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? '';

  const { mission, completedCount, completeMission, simulateImpulse } = useInterceptaMission(studentId);
  const { progress } = useDomainProgress(studentId);
  const { recentMoods, checkin } = useMoodCheckins(studentId);

  if (!user) return null;

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5">
            <span aria-hidden className="text-sm">🔄</span>
            <span className="text-xs font-semibold text-brand-600">{completedCount}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
        <CheckinHumor recentMoods={recentMoods} onCheckin={checkin} />

        <InterceptaCard
          mission={mission}
          completedCount={completedCount}
          onAnswer={completeMission}
          onSimulateImpulse={simulateImpulse}
        />

        <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-700">Seu progresso</h2>
          {progress.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">Ainda sem progresso registrado.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {progress.map((p) => (
                <li key={p.subject} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-ink-700">{p.subject}</span>
                  <span className="text-ink-500">
                    Nível {p.level} · {p.pfAccumulated} PF
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
