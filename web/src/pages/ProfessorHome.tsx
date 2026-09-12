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
