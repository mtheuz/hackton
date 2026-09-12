import { useEffect } from 'react';
import type { MoodCheckin, MoodValue } from '../types/intercepta';
import { CheckinHumor } from './CheckinHumor';

interface MoodCheckInOverlayProps {
  recentMoods: MoodCheckin[];
  onCheckin: (mood: MoodValue) => void;
  onSkip: () => void;
}

const AUTO_DISMISS_MS = 1200;

export function MoodCheckInOverlay({ recentMoods, onCheckin, onSkip }: MoodCheckInOverlayProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onSkip();
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onSkip]);

  function handleCheckin(mood: MoodValue) {
    onCheckin(mood);
    window.setTimeout(onSkip, AUTO_DISMISS_MS);
  }

  return (
    <div
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
