import { SimpleBarChart } from './SimpleBarChart';
import type { MoodSnapshotBucket, MoodValue } from '../types/intercepta';
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

interface ClassMoodTodayProps {
  buckets: MoodSnapshotBucket[];
  loading: boolean;
  isMock?: boolean;
}

export function ClassMoodToday({ buckets, loading, isMock = false }: ClassMoodTodayProps) {
  if (loading) return null;

  const bars = buckets.map(({ mood, count }) => {
    const { Icon, label } = MOOD_DISPLAY[mood];
    return {
      key: mood,
      label,
      tableLabel: `${label} (${count} alunos)`,
      value: count,
      displayValue: `${count}`,
      icon: <Icon aria-hidden className="h-4 w-4" />,
    };
  });

  return (
    <SimpleBarChart
      bare
      title="Humor da turma hoje"
      badge={isMock ? 'Exemplo' : undefined}
      bars={bars}
      emptyMessage="Ainda sem dados suficientes (mínimo de 3 alunos por faixa de humor, pra proteger a identidade de quem respondeu)."
    />
  );
}
