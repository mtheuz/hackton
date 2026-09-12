import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useInterceptaMission } from '../hooks/useInterceptaMission';
import { useDomainProgress } from '../hooks/useDomainProgress';
import { useMoodCheckins } from '../hooks/useMoodCheckins';
import { useLiveSession } from '../hooks/useLiveSession';
import { InterceptaCard } from '../components/InterceptaCard';
import { CheckinHumor } from '../components/CheckinHumor';
import { LogoutButton } from '../components/LogoutButton';
import { ModoAulaAluno } from '../components/ModoAulaAluno';
import { AlunoTabBar, type AlunoTab } from '../components/AlunoTabBar';

export function AlunoHome() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? '';

  const { mission, completedCount, completeMission, simulateImpulse } = useInterceptaMission(studentId);
  const { progress } = useDomainProgress(studentId);
  const { recentMoods, checkin } = useMoodCheckins(studentId);
  const {
    session: liveSession,
    activity: liveActivity,
    answered: liveAnswered,
    joining: liveJoining,
    joinError: liveJoinError,
    join: joinLiveSession,
    submitAnswer: submitLiveAnswer,
    leave: leaveLiveSession,
  } = useLiveSession(studentId);

  const [tab, setTab] = useState<AlunoTab>('intercepta');
  const sessionActive = liveSession?.status === 'active';

  useEffect(() => {
    if (sessionActive) setTab('aula');
  }, [sessionActive]);

  if (!user) return null;

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5">
              <span aria-hidden className="text-sm">🔄</span>
              <span className="text-xs font-semibold text-brand-600">{completedCount}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 pb-24 sm:p-6">
        {tab === 'aula' && (
          <ModoAulaAluno
            session={liveSession}
            activity={liveActivity}
            answered={liveAnswered}
            joining={liveJoining}
            joinError={liveJoinError}
            onJoin={joinLiveSession}
            onSubmitAnswer={submitLiveAnswer}
            onLeave={leaveLiveSession}
          />
        )}

        {tab === 'intercepta' && (
          <>
            <CheckinHumor recentMoods={recentMoods} onCheckin={checkin} />
            <InterceptaCard
              mission={mission}
              completedCount={completedCount}
              onAnswer={completeMission}
              onSimulateImpulse={simulateImpulse}
            />
          </>
        )}

        {tab === 'progresso' && (
          <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-700">Seu progresso</h2>
            {progress.length === 0 ? (
              <p className="mt-2 text-sm text-ink-500">Ainda sem progresso registrado.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {progress.map((p) => (
                  <li key={p.subject} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink-700">{p.subject}</span>
                    <span className="font-medium text-ink-700">
                      Nível {p.level} · {p.pfAccumulated} PF
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      <AlunoTabBar active={tab} onChange={setTab} aulaBadge={sessionActive && !liveAnswered} />
    </div>
  );
}
