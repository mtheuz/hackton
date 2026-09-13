import BarChartIcon from '~icons/streamline-emojis/bar-chart';
import { useClassOverview } from '../hooks/useClassOverview';
import { useClassMoodPerformance } from '../hooks/useClassMoodPerformance';
import { ClassMoodInsight } from './ClassMoodInsight';
import type { Discipline } from '../types/disciplina';
import type { TeacherClass } from '../types/modoAula';

interface TurmaOverviewProps {
  classInfo: TeacherClass;
  disciplines: Discipline[];
  onAssignDiscipline: (classId: string, disciplineId: string) => Promise<void>;
}

export function TurmaOverview({ classInfo, disciplines, onAssignDiscipline }: TurmaOverviewProps) {
  const { overview, loading } = useClassOverview(classInfo.id);
  const { buckets: moodBuckets, loading: moodLoading } = useClassMoodPerformance(classInfo.id);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">{classInfo.name}</h2>

      <label htmlFor={`discipline-${classInfo.id}`} className="mt-2 block text-xs font-semibold text-ink-700">
        Disciplina
      </label>
      <select
        id={`discipline-${classInfo.id}`}
        value={classInfo.disciplineId ?? ''}
        onChange={(e) => void onAssignDiscipline(classInfo.id, e.target.value)}
        className="min-h-11 w-full rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
      >
        <option value="" disabled>
          Selecione...
        </option>
        {disciplines.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {!loading && (
        <>
          <h3 className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <BarChartIcon aria-hidden className="h-4 w-4" />
            Desempenho
          </h3>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[11px] text-ink-500">Sessões</dt>
              <dd className="text-sm font-semibold text-ink-700">{overview.sessionCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-500">Alunos</dt>
              <dd className="text-sm font-semibold text-ink-700">{overview.participantCount}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-ink-500">Acerto quiz</dt>
              <dd className="text-sm font-semibold text-ink-700">
                {overview.quizAccuracy === null ? '—' : `${overview.quizAccuracy}%`}
              </dd>
            </div>
          </dl>

          <ClassMoodInsight buckets={moodBuckets} loading={moodLoading} />
        </>
      )}
    </section>
  );
}
