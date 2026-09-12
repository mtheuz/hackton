import type { EngagementStat, MoodStat } from '../types/escola';
import type { MoodValue } from '../types/intercepta';

const MOOD_EMOJI: Record<MoodValue, string> = {
  muito_mal: '😞',
  mal: '😕',
  neutro: '😐',
  bem: '🙂',
  muito_bem: '😄',
};

const ENGAGEMENT_LABEL = {
  intercepta_mission: 'Trocas de impulso por estudo',
  activity_answer: 'Participação em Modo Aula',
} as const;

interface EscolaDashboardProps {
  moodStats: MoodStat[];
  engagementStats: EngagementStat[];
  loading: boolean;
}

function sumBy<T, K extends string>(rows: T[], keyOf: (row: T) => K, valueOf: (row: T) => number): Record<K, number> {
  const totals = {} as Record<K, number>;
  for (const row of rows) {
    const key = keyOf(row);
    totals[key] = (totals[key] ?? 0) + valueOf(row);
  }
  return totals;
}

export function EscolaDashboard({ moodStats, engagementStats, loading }: EscolaDashboardProps) {
  if (loading) return null;

  if (moodStats.length === 0 && engagementStats.length === 0) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Sinais da turma</h2>
        <p className="mt-2 text-sm text-ink-500">
          Sem dados suficientes ainda pra exibir com segurança (esperando pelo menos 3 alunos por grupo).
        </p>
      </section>
    );
  }

  const moodTotals = sumBy(
    moodStats,
    (row) => row.mood,
    (row) => row.studentCount,
  );
  const engagementTotals = sumBy(
    engagementStats,
    (row) => row.eventType,
    (row) => row.studentCount,
  );
  const maxMoodTotal = Math.max(1, ...Object.values(moodTotals));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Humor agregado da turma</h2>
        <ul className="mt-3 space-y-2">
          {(Object.keys(MOOD_EMOJI) as MoodValue[])
            .filter((mood) => moodTotals[mood])
            .map((mood) => {
              const count = moodTotals[mood] ?? 0;
              const pct = Math.round((count / maxMoodTotal) * 100);
              return (
                <li key={mood}>
                  <div className="flex justify-between text-xs font-medium text-ink-700">
                    <span>
                      {MOOD_EMOJI[mood]} {mood.replace('_', ' ')}
                    </span>
                    <span>{count} alunos</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-canvas">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Engajamento da turma</h2>
        <ul className="mt-3 space-y-2">
          {(Object.keys(ENGAGEMENT_LABEL) as (keyof typeof ENGAGEMENT_LABEL)[])
            .filter((type) => engagementTotals[type])
            .map((type) => (
              <li key={type} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{ENGAGEMENT_LABEL[type]}</span>
                <span className="font-medium text-ink-700">{engagementTotals[type]} alunos</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
