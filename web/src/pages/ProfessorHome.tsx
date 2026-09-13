import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { useSessionLiveStats } from '../hooks/useSessionLiveStats';
import { useSessionDoubtCount } from '../hooks/useSessionDoubtCount';
import { useClassMoodSnapshot } from '../hooks/useClassMoodSnapshot';
import { useDisciplines } from '../hooks/useDisciplines';
import { useLessons } from '../hooks/useLessons';
import { fetchLessonSlides } from '../hooks/useLessonSlides';
import { ModoAulaProfessor } from '../components/ModoAulaProfessor';
import { DisciplinaManager } from '../components/DisciplinaManager';
import { TurmaOverview } from '../components/TurmaOverview';
import { LessonList } from '../components/LessonList';
import { ProfessorDashboard } from '../components/ProfessorDashboard';
import { ProfessorTabBar, ProfessorTabBarDesktop, type ProfessorTab } from '../components/ProfessorTabBar';
import type { LiveActivity, PollContent, QuizContent } from '../types/modoAula';
import type { Lesson, LessonSlide } from '../types/lesson';

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
    startSessionFromLesson,
    endSession,
    launchActivity,
    launchSlide,
    sendContentTrigger,
    assignDiscipline,
  } = useTeacherSession(teacherId);
  const tally = useSessionLiveStats(session?.id ?? null, activity?.id ?? null, optionCountFor(activity));
  const doubtCount = useSessionDoubtCount(session?.id ?? null);
  const { buckets: moodBuckets, loading: moodLoading, isMock: moodIsMock } = useClassMoodSnapshot(session?.classId ?? null);
  const { disciplines, createDiscipline, renameDiscipline } = useDisciplines(teacherId);
  const { lessons, loading: lessonsLoading, createLesson, updateLesson, deleteLesson } = useLessons(teacherId);

  const [tab, setTab] = useState<ProfessorTab>('dashboard');
  const [pendingSlides, setPendingSlides] = useState<LessonSlide[]>([]);

  if (!user) return null;

  async function handleStartLesson(lesson: Lesson) {
    const slides = await fetchLessonSlides(lesson.id);
    await startSessionFromLesson(lesson, slides[0]);
    setPendingSlides(slides.slice(1));
  }

  async function handleLaunchSlide(slide: LessonSlide) {
    await launchSlide(slide);
    setPendingSlides((prev) => prev.filter((s) => s.id !== slide.id));
  }

  async function handleEndSession() {
    await endSession();
    setPendingSlides([]);
  }

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-8">
          <button type="button" onClick={() => setTab('dashboard')} className="text-left">
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </button>
          <LogoutButton />
        </div>
      </header>

      {session ? (
        <main className="mx-auto max-w-5xl space-y-4 p-4 pb-24 sm:p-6 md:pb-8 lg:p-8">
          <ModoAulaProfessor
            classes={classes}
            session={session}
            sessionConfig={sessionConfig}
            activity={activity}
            tally={tally}
            doubtCount={doubtCount}
            pendingSlides={pendingSlides}
            moodBuckets={moodBuckets}
            moodLoading={moodLoading}
            moodIsMock={moodIsMock}
            onStartSession={startSession}
            onEndSession={handleEndSession}
            onLaunchActivity={launchActivity}
            onLaunchSlide={handleLaunchSlide}
            onSendContentTrigger={sendContentTrigger}
          />
        </main>
      ) : (
        <>
          <main className="mx-auto max-w-5xl space-y-4 p-4 pb-24 sm:p-6 md:space-y-6 md:pb-10 lg:p-8">
            <ProfessorTabBarDesktop active={tab} onChange={setTab} />

            {tab === 'dashboard' && (
              <ProfessorDashboard
                teacherName={user.name}
                classes={classes}
                lessons={lessons}
                disciplines={disciplines}
              />
            )}

            {tab === 'disciplinas' && (
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-full sm:w-80">
                  <DisciplinaManager disciplines={disciplines} onCreate={createDiscipline} onRename={renameDiscipline} />
                </div>
                {classes.map((c) => (
                  <div key={c.id} className="w-full sm:w-80">
                    <TurmaOverview classInfo={c} disciplines={disciplines} onAssignDiscipline={assignDiscipline} />
                  </div>
                ))}
              </div>
            )}

            {tab === 'aulas' && (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <LessonList
                  classes={classes}
                  lessons={lessons}
                  loading={lessonsLoading}
                  onCreateLesson={createLesson}
                  onUpdateLesson={updateLesson}
                  onDeleteLesson={deleteLesson}
                  onStartLesson={handleStartLesson}
                />
                <ModoAulaProfessor
                  classes={classes}
                  session={null}
                  sessionConfig={sessionConfig}
                  activity={activity}
                  tally={tally}
                  onStartSession={startSession}
                  onEndSession={handleEndSession}
                  onLaunchActivity={launchActivity}
                  onSendContentTrigger={sendContentTrigger}
                />
              </div>
            )}
          </main>

          <ProfessorTabBar active={tab} onChange={setTab} />
        </>
      )}
    </div>
  );
}
