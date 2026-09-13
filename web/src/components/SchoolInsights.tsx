import type { SchoolDailySignal } from '../types/school';
import DisappointedFaceIcon from '~icons/streamline-emojis/disappointed-face';
import ConfusedFaceIcon from '~icons/streamline-emojis/confused-face';
import NeutralFaceIcon from '~icons/streamline-emojis/neutral-face';
import SlightlySmilingFaceIcon from '~icons/streamline-emojis/slightly-smiling-face';
import GrinningFaceWithSmilingEyesIcon from '~icons/streamline-emojis/grinning-face-with-smiling-eyes';
import SynchronizeArrowIcon from '~icons/streamline-ultimate-color/synchronize-arrow';
import PersonRaisingHandIcon from '~icons/twemoji/person-raising-hand';

interface SchoolInsightsProps {
  signals: SchoolDailySignal[];
  loading: boolean;
}

const MOOD_ICONS = [
  DisappointedFaceIcon,
  ConfusedFaceIcon,
  NeutralFaceIcon,
  SlightlySmilingFaceIcon,
  GrinningFaceWithSmilingEyesIcon,
];

function moodIcon(score: number): typeof DisappointedFaceIcon {
  const index = Math.min(4, Math.max(0, Math.round(score) - 1));
  return MOOD_ICONS[index];
}

function MoodBadge({ score }: { score: number }) {
  const Icon = moodIcon(score);
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-4 w-4" aria-hidden />
      {score.toFixed(1)}
    </span>
  );
}

function formatDay(day: string): string {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
}

export function SchoolInsights({ signals, loading }: SchoolInsightsProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <p className="text-sm text-ink-500">Carregando sinais da escola...</p>
      </section>
    );
  }

  const moodDays = signals.filter((s) => s.metric === 'mood_avg');
  const impulseDays = signals.filter((s) => s.metric === 'trocas_impulso');
  const answerDays = signals.filter((s) => s.metric === 'modo_aula_respostas');

  const moodWeightedSum = moodDays.reduce((acc, s) => acc + s.value * s.sampleSize, 0);
  const moodSampleTotal = moodDays.reduce((acc, s) => acc + s.sampleSize, 0);
  const moodAvg = moodSampleTotal > 0 ? moodWeightedSum / moodSampleTotal : null;

  const impulseTotal = impulseDays.reduce((acc, s) => acc + s.value, 0);
  const answerTotal = answerDays.reduce((acc, s) => acc + s.value, 0);

  const days = Array.from(new Set(signals.map((s) => s.day))).sort();
  const MoodIcon = moodAvg !== null ? moodIcon(moodAvg) : null;

  if (days.length === 0) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Sinais da escola</h2>
        <p className="mt-2 text-sm text-ink-500">
          Ainda sem dados suficientes para exibir (mínimo de 5 registros no dia, k-anonimato).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">Sinais da escola · últimos {days.length} dias com dados</h2>
      <p className="mt-1 text-xs text-ink-500">Agregado e anonimizado por escola (mínimo de 5 registros/dia).</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-canvas p-3 text-center">
          <div className="flex justify-center">
            {MoodIcon ? <MoodIcon className="h-7 w-7" aria-hidden /> : <span className="text-2xl text-ink-300">—</span>}
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-700">{moodAvg !== null ? moodAvg.toFixed(1) : '—'}</p>
          <p className="text-[11px] text-ink-500">Humor médio</p>
        </div>
        <div className="rounded-xl bg-canvas p-3 text-center">
          <div className="flex justify-center">
            <SynchronizeArrowIcon className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-700">{impulseTotal}</p>
          <p className="text-[11px] text-ink-500">Trocas de impulso</p>
        </div>
        <div className="rounded-xl bg-canvas p-3 text-center">
          <div className="flex justify-center">
            <PersonRaisingHandIcon className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-1 text-xs font-semibold text-ink-700">{answerTotal}</p>
          <p className="text-[11px] text-ink-500">Respostas Modo Aula</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {days.map((day) => {
          const mood = moodDays.find((s) => s.day === day);
          const impulse = impulseDays.find((s) => s.day === day);
          const answers = answerDays.find((s) => s.day === day);
          return (
            <li key={day} className="flex items-center justify-between rounded-lg bg-canvas px-3 py-2 text-xs">
              <span className="font-medium text-ink-700">{formatDay(day)}</span>
              <span className="flex items-center gap-3 text-ink-700">
                <span title="Humor médio">{mood ? <MoodBadge score={mood.value} /> : '—'}</span>
                <span title="Trocas de impulso por estudo" className="inline-flex items-center gap-1">
                  <SynchronizeArrowIcon className="h-4 w-4" aria-hidden />
                  {impulse?.value ?? '—'}
                </span>
                <span title="Respostas no Modo Aula" className="inline-flex items-center gap-1">
                  <PersonRaisingHandIcon className="h-4 w-4" aria-hidden />
                  {answers?.value ?? '—'}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
