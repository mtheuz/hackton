import FireIcon from '~icons/twemoji/fire';

interface StreakBadgeProps {
  streak: number;
  activeToday: boolean;
}

export function StreakBadge({ streak, activeToday }: StreakBadgeProps) {
  if (streak === 0) return null;

  return (
    <div
      className={[
        'flex items-center gap-1 rounded-full px-3 py-1.5',
        activeToday ? 'bg-warning-50' : 'bg-line-200',
      ].join(' ')}
      title={activeToday ? 'Ofensiva de hoje contada!' : 'Responda hoje pra manter a ofensiva'}
    >
      <FireIcon aria-hidden className={['h-4 w-4', activeToday ? '' : 'grayscale opacity-60'].join(' ')} />
      <span className="text-xs font-semibold text-ink-700">{streak}</span>
    </div>
  );
}
