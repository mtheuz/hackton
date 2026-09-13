import BooksIcon from '~icons/twemoji/books';
import GraduationCapIcon from '~icons/streamline-emojis/graduation-cap';
import MemoIcon from '~icons/twemoji/memo';
import type { Discipline } from '../types/disciplina';
import type { Lesson } from '../types/lesson';
import type { TeacherClass } from '../types/modoAula';

interface ProfessorDashboardProps {
  teacherName: string;
  classes: TeacherClass[];
  lessons: Lesson[];
  disciplines: Discipline[];
}

export function ProfessorDashboard({ teacherName, classes, lessons, disciplines }: ProfessorDashboardProps) {
  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-bold text-ink-700">Olá, {teacherName.split(' ')[0]}!</h2>
      <p className="mt-1 text-sm text-ink-500">Resumo das suas turmas e aulas cadastradas.</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line-200 bg-canvas p-4 text-center">
          <BooksIcon aria-hidden className="mx-auto h-8 w-8" />
          <p className="mt-2 text-2xl font-bold text-ink-700">{classes.length}</p>
          <p className="text-xs text-ink-500">Turmas</p>
        </div>
        <div className="rounded-xl border border-line-200 bg-canvas p-4 text-center">
          <MemoIcon aria-hidden className="mx-auto h-8 w-8" />
          <p className="mt-2 text-2xl font-bold text-ink-700">{disciplines.length}</p>
          <p className="text-xs text-ink-500">Disciplinas</p>
        </div>
        <div className="rounded-xl border border-line-200 bg-canvas p-4 text-center">
          <GraduationCapIcon aria-hidden className="mx-auto h-8 w-8" />
          <p className="mt-2 text-2xl font-bold text-ink-700">{lessons.length}</p>
          <p className="text-xs text-ink-500">Aulas cadastradas</p>
        </div>
      </div>
    </section>
  );
}
