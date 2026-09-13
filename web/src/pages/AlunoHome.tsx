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
import RobotIcon from '~icons/streamline-emojis/robot-face-1';
import FireIcon from '~icons/streamline-emojis/fire';

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
  const { buckets: moodPerformance, isMock: moodPerformanceIsMock } = useMoodPerformance(studentId);
  const { recentMoods, loading: moodLoading, checkin } = useMoodCheckins(studentId);
  const { streak, activeToday, recentDays } = useStreak(studentId);
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
    signalDoubt,
  } = useLiveSession(studentId);

  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? undefined;

  const [tab, setTab] = useState<AlunoTab>(codeFromUrl ? 'aula' : 'intercepta');
  const [moodPromptDismissed, setMoodPromptDismissed] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const sessionActive = liveSession?.status === 'active';
  const aulaMode = tab === 'aula' && sessionActive;
  const tutorActivityId = tab === 'aula' && sessionActive ? liveActivity?.id ?? null : tab === 'intercepta' ? mission?.activityId ?? null : null;

  useEffect(() => {
    if (sessionActive) setTab('aula');
  }, [sessionActive]);

  if (!user) return null;

  // Por enquanto, mostra toda vez que o aluno entra no app (sem checar se já
  // respondeu hoje) — decisão temporária, ver [[project-mood-entry-flow]].
  const showMoodPrompt = !moodLoading && !moodPromptDismissed;

  const firstName = user.name.split(' ')[0];
  const sessionDate = liveSession?.createdAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(liveSession.createdAt)) : null;
  const tabMascot: Record<AlunoTab, { src: string; alt: string; headline: string; sub: string }> = {
    aula: {
      src: sessionActive ? '/aluno-mascot-ninja.png' : '/aluno-mascot.png',
      alt: 'Mascote Fokido estudando com um livro',
      headline: `Modo aula ligado, ${firstName}! 📚`,
      sub: 'Acompanhe a aula e responda no seu ritmo.',
    },
    intercepta: {
      src: '/aluno-mascot-m.png',
      alt: 'Mascote Fokido acenando',
      headline: `Bora praticar, ${firstName}! 👋`,
      sub: 'Transforme seu tempo em foco e conquiste novas recompensas hoje.',
    },
    progresso: {
      src: '/aluno-mascot-f.png',
      alt: 'Mascote Fokido olhando estatísticas de progresso',
      headline: `Olha seu progresso, ${firstName}! 📊`,
      sub: 'Veja quanto você já evoluiu em cada matéria.',
    },
  };
  const mascot = tabMascot[tab];

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      {showMoodPrompt && (
        <MoodCheckInOverlay
          recentMoods={recentMoods}
          onCheckin={checkin}
          onSkip={() => setMoodPromptDismissed(true)}
        />
      )}

      <header className={[
        'sticky top-0 z-10 border-b pt-safe backdrop-blur',
        aulaMode ? 'grym-classroom-enter border-brand-800 bg-ink-900/95' : 'border-line-200 bg-canvas/95',
      ].join(' ')}>
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className={aulaMode ? 'text-xs text-white/60' : 'text-xs text-ink-500'}>{aulaMode ? 'Você está em' : 'Olá,'}</p>
            <h1 className={aulaMode ? 'text-base font-semibold text-white' : 'text-base font-semibold text-ink-700'}>{aulaMode ? 'Modo Aula' : user.name}</h1>
            {aulaMode && liveSession.topic && <p className="mt-0.5 max-w-[14rem] truncate text-xs text-white/70" title={liveSession.topic}>{liveSession.topic}</p>}
            {aulaMode && liveSession.teacherName && <p className="max-w-[14rem] truncate text-xs text-white/60">Prof. {liveSession.teacherName}</p>}
            {aulaMode && sessionDate && <p className="text-[11px] text-white/50">{sessionDate}</p>}
          </div>
          <div className="flex items-center gap-2">
            {aulaMode ? <button type="button" onClick={leaveLiveSession} className="min-h-11 rounded-full border border-white/30 px-3 text-xs font-semibold text-white transition-colors hover:border-white/60">Sair da aula</button> : <><StreakBadge streak={streak} activeToday={activeToday} /><div className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5"><SynchronizeArrowIcon aria-hidden className="h-4 w-4" /><span className="text-xs font-semibold text-brand-600">{completedCount}</span></div><LogoutButton /></>}
          </div>
        </div>
      </header>

      <main className={aulaMode ? 'grym-classroom-enter mx-auto max-w-md space-y-4 p-4 pb-24 sm:p-6' : 'mx-auto max-w-md space-y-4 p-4 pb-24 sm:p-6'}>
        <section className="relative mt-6 rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <div className="pr-24 sm:pr-28">
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
              Fokido
            </span>
            <h2 className="mt-1 text-base font-bold text-ink-700">
              {mascot.headline}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              {mascot.sub}
            </p>
          </div>
          <img
            key={mascot.src}
            src={mascot.src}
            alt={mascot.alt}
            className="grym-reveal absolute -top-9 -right-1 h-36 w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-110 pointer-events-none select-none"
          />
        </section>

        {tab === 'aula' && (
          <>
          {sessionActive && !liveContentTrigger && <section className="challenge-question-3d rounded-2xl border p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Apresentação do professor</h2><span className="rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-600">Slide atual</span></div><p className="mt-2 text-xs text-ink-500">Aguardando o professor apresentar um slide ou material.</p></section>}
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
            onSignalDoubt={signalDoubt}
          />
          </>
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
            <section className="streak-card-3d rounded-2xl border p-5 shadow-sm" aria-label="Ofensiva de estudos">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600" aria-hidden>
                  <FireIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Ofensiva de estudos</p>
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                      {activeToday ? 'Hoje contado' : 'Hoje pendente'}
                    </span>
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-700">
                    {streak} <span className="text-sm font-medium text-ink-500">{streak === 1 ? 'dia' : 'dias'}</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-3 border border-line-200/60">
                {recentDays.map((day) => (
                  <div key={day.dayKey} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full transition-all duration-300 ${
                        day.active
                          ? 'bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-sm scale-105'
                          : 'bg-line-200/90 text-transparent'
                      } ${day.isToday && !day.active ? 'ring-2 ring-amber-400/60 ring-offset-1' : ''}`}
                    >
                      {day.active ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-[3]" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink-300/40" />
                      )}
                    </div>
                    <span className={`text-[11px] font-medium ${day.isToday ? 'font-bold text-brand-600' : 'text-ink-500'}`}>
                      {day.dayLabel}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                {activeToday ? 'Você já praticou hoje. Continue no seu ritmo!' : 'Uma prática curta hoje mantém sua ofensiva ativa.'}
              </p>
            </section>
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

            <MoodPerformanceInsight buckets={moodPerformance} isMock={moodPerformanceIsMock} />
          </>
        )}
      </main>

      {tutorActivityId && !tutorOpen && (
        <button
          type="button"
          onClick={() => setTutorOpen(true)}
          aria-label="Abrir Tutor Restrito"
          className="fixed bottom-24 right-4 z-10 flex h-16 w-16 items-center justify-center rounded-full bg-surface shadow-lg active:scale-95"
        >
          <RobotIcon aria-hidden className="h-10 w-10" />
          <span aria-hidden className="absolute -bottom-1.5 right-5 h-4 w-4 rotate-45 rounded-[2px] bg-surface shadow-lg" />
        </button>
      )}
      {tutorOpen && tutorActivityId && (
        <ChatTutor key={tutorActivityId} activityId={tutorActivityId} onClose={() => setTutorOpen(false)} />
      )}

      <AlunoTabBar active={tab} onChange={(next) => { setTutorOpen(false); setTab(next); }} aulaBadge={sessionActive && !liveAnswered} aulaOnly={aulaMode} />
    </div>
  );
}
