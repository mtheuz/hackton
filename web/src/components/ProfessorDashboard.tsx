import type { ReactNode } from 'react';
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

type StatTone = 'brand' | 'success' | 'warning';

const TONE_STYLE: Record<StatTone, { bg: string; shadow: string }> = {
  brand: { bg: 'bg-brand-600', shadow: 'shadow-[0_10px_24px_-8px_rgba(14,90,150,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]' },
  success: { bg: 'bg-success-600', shadow: 'shadow-[0_10px_24px_-8px_rgba(69,201,139,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]' },
  warning: { bg: 'bg-warning-600', shadow: 'shadow-[0_10px_24px_-8px_rgba(255,184,77,0.45),inset_0_1px_0_rgba(255,255,255,0.2)]' },
};

function StatCard({ tone, icon, value, label }: { tone: StatTone; icon: ReactNode; value: number; label: string }) {
  const { bg, shadow } = TONE_STYLE[tone];
  return (
    <div
      className={`rounded-2xl p-4 text-center text-white transition-transform duration-200 hover:-translate-y-0.5 lg:p-6 ${bg} ${shadow}`}
    >
      <div className="mx-auto flex h-8 w-8 items-center justify-center [&>svg]:h-8 [&>svg]:w-8">{icon}</div>
      <p className="mt-2 text-2xl font-bold lg:text-3xl">{value}</p>
      <p className="text-xs text-white/85">{label}</p>
    </div>
  );
}

export function ProfessorDashboard({ teacherName, classes, lessons, disciplines }: ProfessorDashboardProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line-200 bg-surface p-6 shadow-sm lg:p-8">
        <h2 className="text-lg font-bold text-ink-700 lg:text-xl">Olá, {teacherName.split(' ')[0]}!</h2>
        <p className="mt-1 text-sm text-ink-500">Resumo das suas turmas e aulas cadastradas.</p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <StatCard tone="brand" icon={<BooksIcon aria-hidden />} value={classes.length} label="Turmas" />
        <StatCard tone="success" icon={<MemoIcon aria-hidden />} value={disciplines.length} label="Disciplinas" />
        <StatCard tone="warning" icon={<GraduationCapIcon aria-hidden />} value={lessons.length} label="Aulas cadastradas" />
      </div>
    </div>
  );
}
