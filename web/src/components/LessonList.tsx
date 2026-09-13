import { useState } from 'react';
import { LessonEditor } from './LessonEditor';
import type { TeacherClass } from '../types/modoAula';
import type { Lesson, LessonConfig } from '../types/lesson';

interface LessonListProps {
  classes: TeacherClass[];
  lessons: Lesson[];
  loading: boolean;
  onCreateLesson: (classId: string, name: string, subject: string, config: LessonConfig) => Promise<string>;
  onUpdateLesson: (lessonId: string, name: string, subject: string, config: LessonConfig) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onStartLesson: (lesson: Lesson) => Promise<void>;
}

const DEFAULT_CONFIG: LessonConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  accessibilityMode: false,
};

export function LessonList({
  classes,
  lessons,
  loading,
  onCreateLesson,
  onUpdateLesson,
  onDeleteLesson,
  onStartLesson,
}: LessonListProps) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? '');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [startingLessonId, setStartingLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingLesson = lessons.find((l) => l.id === editingLessonId) ?? null;
  const classLessons = lessons.filter((l) => l.classId === selectedClassId);

  if (editingLesson) {
    return (
      <LessonEditor
        lesson={editingLesson}
        onUpdateLesson={(name, subject, config) => onUpdateLesson(editingLesson.id, name, subject, config)}
        onClose={() => setEditingLessonId(null)}
      />
    );
  }

  async function handleCreate() {
    if (!selectedClassId) return;
    setError(null);
    setCreating(true);
    try {
      const id = await onCreateLesson(selectedClassId, 'Nova aula', '', DEFAULT_CONFIG);
      setEditingLessonId(id);
    } catch {
      setError('Não foi possível criar a aula. Tente novamente.');
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(lesson: Lesson) {
    setError(null);
    setStartingLessonId(lesson.id);
    try {
      await onStartLesson(lesson);
    } catch {
      setError('Não foi possível iniciar o Modo Aula. Tente novamente.');
    } finally {
      setStartingLessonId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-semibold text-ink-700">Aulas</h2>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}

      <label htmlFor="lesson-class" className="mt-3 block text-xs font-semibold text-ink-700">
        Turma
      </label>
      <select
        id="lesson-class"
        value={selectedClassId}
        onChange={(e) => setSelectedClassId(e.target.value)}
        className="min-h-11 w-full rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {!loading && (
        <ul className="mt-3 space-y-2">
          {classLessons.length === 0 ? (
            <li className="text-sm text-ink-500">Nenhuma aula cadastrada nessa turma ainda.</li>
          ) : (
            classLessons.map((lesson) => (
              <li key={lesson.id} className="rounded-xl border border-line-200 p-3">
                <p className="text-sm font-semibold text-ink-700">{lesson.name}</p>
                {lesson.subject && <p className="text-xs text-ink-500">{lesson.subject}</p>}
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingLessonId(lesson.id)}
                    className="text-xs font-semibold text-brand-600"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={startingLessonId !== null}
                    onClick={() => void handleStart(lesson)}
                    className="text-xs font-semibold text-success-600 disabled:opacity-50"
                  >
                    {startingLessonId === lesson.id ? 'Iniciando...' : 'Iniciar Modo Aula'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteLesson(lesson.id)}
                    className="text-xs font-semibold text-danger-600"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      <button
        type="button"
        disabled={creating || !selectedClassId}
        onClick={() => void handleCreate()}
        className="mt-3 min-h-11 w-full rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {creating ? 'Criando...' : 'Nova aula'}
      </button>
    </section>
  );
}
