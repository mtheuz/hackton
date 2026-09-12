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
  return (
    <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#31302e]">Como você está agora?</h2>
      <div className="mt-3 flex justify-between">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            aria-label={mood.label}
            onClick={() => onCheckin(mood.value)}
            className="text-2xl transition-transform hover:scale-110"
          >
            {mood.emoji}
          </button>
        ))}
      </div>
      {recentMoods.length > 0 && (
        <div className="mt-4 flex gap-1 text-lg" aria-label="Histórico recente de humor">
          {recentMoods.map((entry) => (
            <span key={entry.id}>{MOODS.find((m) => m.value === entry.mood)?.emoji}</span>
          ))}
        </div>
      )}
    </section>
  );
}
