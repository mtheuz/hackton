import { useState } from 'react';
import type { MoodCheckin, MoodValue } from '../types/intercepta';
import DisappointedFaceIcon from '~icons/twemoji/disappointed-face';
import ConfusedFaceIcon from '~icons/twemoji/confused-face';
import NeutralFaceIcon from '~icons/twemoji/neutral-face';
import SlightlySmilingFaceIcon from '~icons/twemoji/slightly-smiling-face';
import GrinningFaceWithSmilingEyesIcon from '~icons/twemoji/grinning-face-with-smiling-eyes';

const MOODS: { value: MoodValue; Icon: typeof DisappointedFaceIcon; label: string }[] = [
  { value: 'muito_mal', Icon: DisappointedFaceIcon, label: 'Muito mal' },
  { value: 'mal', Icon: ConfusedFaceIcon, label: 'Mal' },
  { value: 'neutro', Icon: NeutralFaceIcon, label: 'Neutro' },
  { value: 'bem', Icon: SlightlySmilingFaceIcon, label: 'Bem' },
  { value: 'muito_bem', Icon: GrinningFaceWithSmilingEyesIcon, label: 'Muito bem' },
];

interface CheckinHumorProps {
  recentMoods: MoodCheckin[];
  onCheckin: (mood: MoodValue) => void;
}

export function CheckinHumor({ recentMoods, onCheckin }: CheckinHumorProps) {
  const [justPicked, setJustPicked] = useState<MoodValue | null>(null);

  function handlePick(mood: MoodValue) {
    setJustPicked(mood);
    onCheckin(mood);
    window.setTimeout(() => setJustPicked((current) => (current === mood ? null : current)), 1200);
  }

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">Como você está agora?</h2>
      <div className="mt-3 flex justify-between gap-1">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            aria-label={mood.label}
            aria-pressed={justPicked === mood.value}
            onClick={() => handlePick(mood.value)}
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
              justPicked === mood.value ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-canvas',
            ].join(' ')}
          >
            <mood.Icon className="h-7 w-7" aria-hidden />
          </button>
        ))}
      </div>
      {recentMoods.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-ink-500">Últimos check-ins:</span>
          <div className="flex gap-1" aria-label="Histórico recente de humor">
            {recentMoods.map((entry) => {
              const mood = MOODS.find((m) => m.value === entry.mood);
              if (!mood) return null;
              return (
                <span key={entry.id} role="img" aria-label={mood.label}>
                  <mood.Icon className="h-5 w-5" aria-hidden />
                </span>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
