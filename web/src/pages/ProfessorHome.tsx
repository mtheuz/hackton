import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { useSessionLiveStats } from '../hooks/useSessionLiveStats';
import { useDisciplines } from '../hooks/useDisciplines';
import { ModoAulaProfessor } from '../components/ModoAulaProfessor';
import { DisciplinaManager } from '../components/DisciplinaManager';
import { TurmaOverview } from '../components/TurmaOverview';
import { ProfessorTabBar, type ProfessorTab } from '../components/ProfessorTabBar';
import type { LiveActivity, PollContent, QuizContent } from '../types/modoAula';

function optionCountFor(activity: LiveActivity | null): number | null {
  if (!activity) return null;
  if (activity.type === 'quiz' || activity.type === 'poll') {
    return (activity.content as QuizContent | PollContent).options.length;
  }
  return null;
}

export function ProfessorHome() {
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';

  const {
    classes,
    session,
    sessionConfig,
    activity,
    startSession,
    endSession,
    launchActivity,
    sendContentTrigger,
    assignDiscipline,
  } = useTeacherSession(teacherId);
  const tally = useSessionLiveStats(session?.id ?? null, activity?.id ?? null, optionCountFor(activity));
  const { disciplines, createDiscipline, renameDiscipline } = useDisciplines(teacherId);

  const [tab, setTab] = useState<ProfessorTab>('aula');

  if (!user) return null;

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 pb-24 sm:p-6">
        <section className="relative mt-6 rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <div className="pr-24 sm:pr-28">
            <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">
              Painel do Professor
            </span>
            <h2 className="mt-1 text-base font-bold text-ink-700">
              Olá, Prof. {user.name.split(' ')[0]}! 📋
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              Gerencie suas turmas, inicie sessões ativas e acompanhe o engajamento em tempo real.
            </p>
          </div>
          <img
            src="/professor-mascot.png"
            alt="Mascote Professora Fokido"
            className="absolute -top-9 -right-1 h-36 w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-110 pointer-events-none select-none"
          />
        </section>

        {tab === 'aula' && (
          <ModoAulaProfessor
            classes={classes}
            session={session}
            sessionConfig={sessionConfig}
            activity={activity}
            tally={tally}
            onStartSession={startSession}
            onEndSession={endSession}
            onLaunchActivity={launchActivity}
            onSendContentTrigger={sendContentTrigger}
          />
        )}

        {tab === 'turmas' && (
          <>
            <DisciplinaManager disciplines={disciplines} onCreate={createDiscipline} onRename={renameDiscipline} />

            {classes.map((c) => (
              <TurmaOverview
                key={c.id}
                classInfo={c}
                disciplines={disciplines}
                onAssignDiscipline={assignDiscipline}
              />
            ))}
          </>
        )}
      </main>

      <ProfessorTabBar active={tab} onChange={setTab} />
    </div>
  );
}
