import type { MoodPerformanceBucket, MoodValue } from '../types/intercepta';
import DisappointedFaceIcon from '~icons/twemoji/disappointed-face';
import ConfusedFaceIcon from '~icons/twemoji/confused-face';
import NeutralFaceIcon from '~icons/twemoji/neutral-face';
import SlightlySmilingFaceIcon from '~icons/twemoji/slightly-smiling-face';
import GrinningFaceWithSmilingEyesIcon from '~icons/twemoji/grinning-face-with-smiling-eyes';

const MOOD_DISPLAY: Record<MoodValue, { Icon: typeof DisappointedFaceIcon; label: string }> = {
  muito_mal: { Icon: DisappointedFaceIcon, label: 'Muito mal' },
  mal: { Icon: ConfusedFaceIcon, label: 'Mal' },
  neutro: { Icon: NeutralFaceIcon, label: 'Neutro' },
  bem: { Icon: SlightlySmilingFaceIcon, label: 'Bem' },
  muito_bem: { Icon: GrinningFaceWithSmilingEyesIcon, label: 'Muito bem' },
};

interface MoodPerformanceInsightProps {
  buckets: MoodPerformanceBucket[];
}

export function MoodPerformanceInsight({ buckets }: MoodPerformanceInsightProps) {
  if (buckets.length < 2) return null;

  const best = buckets.reduce((a, b) => (b.accuracy > a.accuracy ? b : a));
  const worst = buckets.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  const gap = best.accuracy - worst.accuracy;

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">Seu Raio-X: humor × acerto</h2>
      <ul className="mt-3 space-y-2">
        {buckets.map(({ mood, accuracy, sampleSize }) => {
          const { Icon, label } = MOOD_DISPLAY[mood];
          return (
            <li key={mood} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-700">
                <Icon aria-hidden className="h-5 w-5" />
                {label}
              </span>
              <span className="text-xs text-ink-500">
                <span className="font-semibold text-ink-700">{accuracy}%</span> de acerto · {sampleSize} respostas
              </span>
            </li>
          );
        })}
      </ul>
      {gap >= 15 && (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Você acerta {gap} pontos a mais quando está <strong>{MOOD_DISPLAY[best.mood].label.toLowerCase()}</strong> do que quando
          está <strong>{MOOD_DISPLAY[worst.mood].label.toLowerCase()}</strong>. Vale um check-in de humor antes de estudar.
        </p>
      )}
    </section>
  );
}
