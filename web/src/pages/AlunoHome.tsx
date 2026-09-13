import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useInterceptaMission } from '../hooks/useInterceptaMission';
import { useDomainProgress } from '../hooks/useDomainProgress';
import { useMoodCheckins } from '../hooks/useMoodCheckins';
import { useMoodPerformance } from '../hooks/useMoodPerformance';
import { useStreak } from '../hooks/useStreak';
import { useLiveSession } from '../hooks/useLiveSession';
import { InterceptaCard } from '../components/InterceptaCard';
import { MoodCheckInOverlay } from '../components/MoodCheckInOverlay';
import { LogoutButton } from '../components/LogoutButton';
import { ModoAulaAluno } from '../components/ModoAulaAluno';
import { MoodPerformanceInsight } from '../components/MoodPerformanceInsight';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { StreakBadge } from '../components/StreakBadge';
import { ChatTutor } from '../components/ChatTutor';
import { AlunoTabBar, type AlunoTab } from '../components/AlunoTabBar';
import SynchronizeArrowIcon from '~icons/streamline-ultimate-color/synchronize-arrow';
import GraduationCapIcon from '~icons/twemoji/graduation-cap';

export function AlunoHome() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? '';

  const {
    mission,
    completedCount,
    loading: missionLoading,
    completeMission,
    simulateImpulse,
  } = useInterceptaMission(studentId);
  const { progress } = useDomainProgress(studentId);
  const { buckets: moodPerformance } = useMoodPerformance(studentId);
  const { recentMoods, loading: moodLoading, checkin } = useMoodCheckins(studentId);
  const { streak, activeToday } = useStreak(studentId);
  const {
    session: liveSession,
    activity: liveActivity,
    contentTrigger: liveContentTrigger,
    sessionConfig: liveSessionConfig,
    answered: liveAnswered,
    joining: liveJoining,
    joinError: liveJoinError,
    join: joinLiveSession,
    submitAnswer: submitLiveAnswer,
    leave: leaveLiveSession,
  } = useLiveSession(studentId);

  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? undefined;

  const [tab, setTab] = useState<AlunoTab>(codeFromUrl ? 'aula' : 'intercepta');
  const [moodPromptDismissed, setMoodPromptDismissed] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const sessionActive = liveSession?.status === 'active';
  const tutorActivityId = tab === 'aula' && sessionActive ? liveActivity?.id ?? null : tab === 'intercepta' ? mission?.activityId ?? null : null;

  useEffect(() => {
    if (sessionActive) setTab('aula');
  }, [sessionActive]);

  if (!user) return null;

  // Por enquanto, mostra toda vez que o aluno entra no app (sem checar se já
  // respondeu hoje) — decisão temporária, ver [[project-mood-entry-flow]].
  const showMoodPrompt = !moodLoading && !moodPromptDismissed;

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      {showMoodPrompt && (
        <MoodCheckInOverlay
          recentMoods={recentMoods}
          onCheckin={checkin}
          onSkip={() => setMoodPromptDismissed(true)}
        />
      )}

      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={streak} activeToday={activeToday} />
            <div className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5">
              <SynchronizeArrowIcon aria-hidden className="h-4 w-4" />
              <span className="text-xs font-semibold text-brand-600">{completedCount}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 pb-24 sm:p-6">
        <section className="relative mt-6 rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <div className="pr-24 sm:pr-28">
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
              Fokido
            </span>
            <h2 className="mt-1 text-base font-bold text-ink-700">
              Bora praticar, {user.name.split(' ')[0]}! 👋
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Transforme seu tempo em foco e conquiste novas recompensas hoje.
            </p>
          </div>
          <img
            src="/aluno-mascot.png"
            alt="Mascote Fokido"
            className="absolute -top-9 -right-1 h-36 w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-110 pointer-events-none select-none"
          />
        </section>

        {tab === 'aula' && (
          <ModoAulaAluno
            key={`${liveSession?.id ?? "join"}:${liveActivity?.id ?? "waiting"}`}
            session={liveSession}
            activity={liveActivity}
            contentTrigger={liveContentTrigger}
            sessionConfig={liveSessionConfig}
            answered={liveAnswered}
            joining={liveJoining}
            joinError={liveJoinError}
            initialCode={codeFromUrl}
            onJoin={joinLiveSession}
            onSubmitAnswer={submitLiveAnswer}
            onLeave={leaveLiveSession}
          />
        )}

        {tab === 'intercepta' && (
          <InterceptaCard
            mission={mission}
            loading={missionLoading}
            completedCount={completedCount}
            onAnswer={completeMission}
            onSimulateImpulse={simulateImpulse}
          />
        )}

        {tab === 'progresso' && (
          <>
            <SimpleBarChart
              title="Seu progresso"
              bars={progress.map((p) => ({
                key: p.subject,
                label: p.subject.charAt(0).toUpperCase() + p.subject.slice(1),
                value: p.pfAccumulated,
                displayValue: `${p.pfAccumulated} PF`,
                tableLabel: `${p.subject} — Nível ${p.level}, ${p.pfAccumulated} PF`,
              }))}
              emptyMessage="Ainda sem progresso registrado."
            />

            <MoodPerformanceInsight buckets={moodPerformance} />
          </>
        )}
      </main>

      {tutorActivityId && !tutorOpen && (
        <button
          type="button"
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-24 right-4 z-10 flex min-h-11 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-lg active:bg-brand-800"
        >
          <GraduationCapIcon aria-hidden className="h-4 w-4" />
          Tutor
        </button>
      )}
      {tutorOpen && tutorActivityId && (
        <ChatTutor key={tutorActivityId} activityId={tutorActivityId} onClose={() => setTutorOpen(false)} />
      )}

      <AlunoTabBar active={tab} onChange={(next) => { setTutorOpen(false); setTab(next); }} aulaBadge={sessionActive && !liveAnswered} />
    </div>
  );
}
