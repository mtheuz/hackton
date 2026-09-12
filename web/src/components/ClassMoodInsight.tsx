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

interface ClassMoodInsightProps {
  buckets: MoodPerformanceBucket[];
  loading: boolean;
}

export function ClassMoodInsight({ buckets, loading }: ClassMoodInsightProps) {
  if (loading) return null;

  return (
    <div className="mt-4 border-t border-line-200 pt-4">
      <h3 className="text-xs font-semibold text-ink-700">Humor × acerto em quiz (anônimo)</h3>
      {buckets.length === 0 ? (
        <p className="mt-1 text-[11px] text-ink-500">
          Ainda sem dados suficientes (mínimo de 3 alunos por faixa de humor, pra proteger a identidade de quem respondeu).
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {buckets.map(({ mood, accuracy, sampleSize }) => {
            const { Icon, label } = MOOD_DISPLAY[mood];
            return (
              <li key={mood} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-ink-700">
                  <Icon aria-hidden className="h-4 w-4" />
                  {label}
                </span>
                <span className="text-ink-500">
                  <span className="font-semibold text-ink-700">{accuracy}%</span> de acerto · {sampleSize} alunos
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
