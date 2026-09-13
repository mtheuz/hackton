import { SimpleBarChart } from './SimpleBarChart';
import type { MoodPerformanceBucket, MoodValue } from '../types/intercepta';
import DisappointedFaceIcon from '~icons/streamline-emojis/disappointed-face';
import ConfusedFaceIcon from '~icons/streamline-emojis/confused-face';
import NeutralFaceIcon from '~icons/streamline-emojis/neutral-face';
import SlightlySmilingFaceIcon from '~icons/streamline-emojis/slightly-smiling-face';
import GrinningFaceWithSmilingEyesIcon from '~icons/streamline-emojis/grinning-face-with-smiling-eyes';

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

  const bars = buckets.map(({ mood, accuracy, sampleSize }) => {
    const { Icon, label } = MOOD_DISPLAY[mood];
    return {
      key: mood,
      label,
      tableLabel: `${label} (${sampleSize} respostas)`,
      value: accuracy,
      displayValue: `${accuracy}%`,
      icon: <Icon aria-hidden className="h-4 w-4" />,
    };
  });

  return (
    <div className="space-y-3">
      <SimpleBarChart title="Seu Raio-X: humor × acerto" bars={bars} emptyMessage="" />
      {gap >= 15 && (
        <p className="text-xs leading-relaxed text-ink-500">
          Você acerta {gap} pontos a mais quando está{' '}
          <strong>{MOOD_DISPLAY[best.mood].label.toLowerCase()}</strong> do que quando está{' '}
          <strong>{MOOD_DISPLAY[worst.mood].label.toLowerCase()}</strong>. Vale um check-in de humor antes de estudar.
        </p>
      )}
    </div>
  );
}
