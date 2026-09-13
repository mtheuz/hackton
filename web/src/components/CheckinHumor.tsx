import { useEffect, useRef, useState } from 'react';
import type { MoodCheckin, MoodValue } from '../types/intercepta';
import DisappointedFaceIcon from '~icons/streamline-emojis/disappointed-face';
import ConfusedFaceIcon from '~icons/streamline-emojis/confused-face';
import NeutralFaceIcon from '~icons/streamline-emojis/neutral-face';
import SlightlySmilingFaceIcon from '~icons/streamline-emojis/slightly-smiling-face';
import GrinningFaceWithSmilingEyesIcon from '~icons/streamline-emojis/grinning-face-with-smiling-eyes';

const MOODS: { value: MoodValue; Icon: typeof DisappointedFaceIcon; label: string }[] = [
  { value: 'muito_mal', Icon: DisappointedFaceIcon, label: 'Muito mal' },
  { value: 'mal', Icon: ConfusedFaceIcon, label: 'Mal' },
  { value: 'neutro', Icon: NeutralFaceIcon, label: 'Neutro' },
  { value: 'bem', Icon: SlightlySmilingFaceIcon, label: 'Bem' },
  { value: 'muito_bem', Icon: GrinningFaceWithSmilingEyesIcon, label: 'Muito bem' },
];

interface CheckinHumorProps {
  recentMoods: MoodCheckin[];
  onCheckin: (mood: MoodValue) => void | Promise<void>;
}

export function CheckinHumor({ recentMoods, onCheckin }: CheckinHumorProps) {
  const [justPicked, setJustPicked] = useState<MoodValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function handlePick(mood: MoodValue) {
    if (saving || justPicked) return;
    setSaving(true);
    setError(null);
    setJustPicked(mood);
    try {
      await onCheckin(mood);
      timer.current = setTimeout(() => setJustPicked(null), 1200);
    } catch {
      setJustPicked(null);
      setError('Não foi possível salvar seu check-in. Tente novamente ou toque em Agora não.');
    } finally {
      setSaving(false);
    }
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
            disabled={saving || justPicked !== null}
            onClick={() => void handlePick(mood.value)}
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
              justPicked === mood.value ? 'bg-brand-100 ring-2 ring-brand-500' : 'hover:bg-canvas',
            ].join(' ')}
          >
            <mood.Icon className="h-7 w-7" aria-hidden />
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-danger-600">{error}</p>}
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
