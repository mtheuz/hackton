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
    <div className="min-h-svh space-y-4 bg-[#f6f5f4] p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-[#31302e]">Olá, {user.name}</h1>

      <CheckinHumor recentMoods={recentMoods} onCheckin={checkin} />

      <InterceptaCard
        mission={mission}
        completedCount={completedCount}
        onAnswer={completeMission}
        onSimulateImpulse={simulateImpulse}
      />

      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#31302e]">Seu progresso</h2>
        {progress.length === 0 ? (
          <p className="mt-2 text-sm text-[#615d59]">Ainda sem progresso registrado.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {progress.map((p) => (
              <li key={p.subject} className="flex items-center justify-between text-sm">
                <span className="capitalize text-[#31302e]">{p.subject}</span>
                <span className="text-[#615d59]">
                  Nível {p.level} · {p.pfAccumulated} PF
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
