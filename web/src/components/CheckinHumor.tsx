import { useState } from 'react';
import type { MoodCheckin, MoodValue } from '../types/intercepta';

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 'muito_mal', emoji: '😞', label: 'Muito mal' },
  { value: 'mal', emoji: '😕', label: 'Mal' },
  { value: 'neutro', emoji: '😐', label: 'Neutro' },
  { value: 'bem', emoji: '🙂', label: 'Bem' },
  { value: 'muito_bem', emoji: '😄', label: 'Muito bem' },
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
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl transition-all active:scale-95',
              justPicked === mood.value ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-canvas',
            ].join(' ')}
          >
            {mood.emoji}
          </button>
        ))}
      </div>
      {recentMoods.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-ink-500">Últimos check-ins:</span>
          <div className="flex gap-1 text-lg" aria-label="Histórico recente de humor">
            {recentMoods.map((entry) => (
              <span key={entry.id}>{MOODS.find((m) => m.value === entry.mood)?.emoji}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
