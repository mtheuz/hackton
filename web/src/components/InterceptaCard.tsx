import { useState } from 'react';
import type { PendingMission } from '../types/intercepta';

interface InterceptaCardProps {
  mission: PendingMission | null;
  loading?: boolean;
  completedCount: number;
  onAnswer: (selectedIndex: number) => Promise<void>;
  onSimulateImpulse: () => Promise<void>;
}

const FEEDBACK_DISPLAY_MS = 2200;

export function InterceptaCard({
  mission: incomingMission,
  loading = false,
  completedCount,
  onAnswer,
  onSimulateImpulse,
}: InterceptaCardProps) {
  const [frozenMission, setFrozenMission] = useState<PendingMission | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayedMission = showFeedback ? frozenMission : incomingMission;

  async function handleAnswer(index: number) {
    setFrozenMission(incomingMission);
    setSelectedIndex(index);
    setShowFeedback(true);
    setSubmitting(true);
    try {
      await onAnswer(index);
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setShowFeedback(false), FEEDBACK_DISPLAY_MS);
    }
  }

  async function handleSimulate() {
    setSubmitting(true);
    try {
      await onSimulateImpulse();
    } finally {
      setSubmitting(false);
    }
  }

  if (!displayedMission) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <p className="text-sm font-medium text-ink-700">
          Trocas de impulso por estudo: {completedCount}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {loading ? 'Carregando...' : 'Sem missão agora. Quando um impulso surgir, ela aparece aqui.'}
        </p>
        <button
          type="button"
          disabled={submitting || loading}
          onClick={() => void handleSimulate()}
          className="mt-3 min-h-11 rounded-full bg-brand-600 px-4 text-xs font-semibold text-white transition-colors active:bg-brand-800 disabled:opacity-50"
        >
          Simular impulso (demo)
        </button>
      </section>
    );
  }

  const mission = displayedMission;
  const isCorrect = selectedIndex !== null && selectedIndex === mission.content.correct_index;

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{mission.content.subject}</p>
      <p className="mt-1 text-sm font-medium text-ink-700">{mission.content.question}</p>
      <div className="mt-3 flex flex-col gap-2">
        {mission.content.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isRightAnswer = showFeedback && index === mission.content.correct_index;
          const isWrongSelection = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={option}
              type="button"
              disabled={showFeedback || submitting}
              onClick={() => void handleAnswer(index)}
              className={[
                'min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-100',
                isRightAnswer
                  ? 'border-success-600 bg-success-50 text-success-600 font-semibold'
                  : isWrongSelection
                    ? 'border-danger-600 bg-danger-50 text-danger-600 font-semibold'
                    : 'border-line-200 text-ink-700 active:bg-canvas',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>
      {showFeedback && (
        <p className={`mt-3 text-xs font-medium ${isCorrect ? 'text-success-600' : 'text-danger-600'}`}>
          {isCorrect
            ? `Valeu por trocar a rede social pelo estudo! +${mission.content.pf_reward} PF`
            : 'Quase! A resposta certa está destacada acima.'}
        </p>
      )}
    </section>
  );
}
