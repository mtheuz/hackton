import { useEffect, useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import type { MoodCheckin, MoodValue } from '../types/intercepta';
import { CheckinHumor } from './CheckinHumor';

interface MoodCheckInOverlayProps {
  recentMoods: MoodCheckin[];
  onCheckin: (mood: MoodValue) => void | Promise<void>;
  onSkip: () => void;
}

const AUTO_DISMISS_MS = 1200;

export function MoodCheckInOverlay({ recentMoods, onCheckin, onSkip }: MoodCheckInOverlayProps) {
  const dialogRef = useDialogFocus(onSkip);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleCheckin(mood: MoodValue) {
    await onCheckin(mood);
    if (mounted.current) timer.current = setTimeout(onSkip, AUTO_DISMISS_MS);
  }

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Check-in de humor"
      onClick={onSkip}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <CheckinHumor recentMoods={recentMoods} onCheckin={handleCheckin} />
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 min-h-11 w-full rounded-full text-center text-xs font-medium text-white/80 transition-colors hover:text-white"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
