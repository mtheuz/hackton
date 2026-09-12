import { useState } from 'react';
import type { PendingMission } from '../types/intercepta';

interface InterceptaCardProps {
  mission: PendingMission | null;
  completedCount: number;
  onAnswer: (selectedIndex: number) => Promise<void>;
  onSimulateImpulse: () => Promise<void>;
}

export function InterceptaCard({ mission, completedCount, onAnswer, onSimulateImpulse }: InterceptaCardProps) {
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAnswer(index: number) {
    setAnswered(true);
    setSubmitting(true);
    try {
      await onAnswer(index);
    } finally {
      setSubmitting(false);
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

  if (!mission) {
    return (
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
        <p className="text-sm text-[#615d59]">Sem missão agora. Trocas de impulso por estudo: {completedCount}</p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSimulate()}
          className="mt-3 rounded-full bg-[#0E5A96] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Simular impulso (demo)
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[#0E5A96]">{mission.content.subject}</p>
      <p className="mt-1 text-sm font-medium text-[#31302e]">{mission.content.question}</p>
      <div className="mt-3 flex flex-col gap-2">
        {mission.content.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answered || submitting}
            onClick={() => void handleAnswer(index)}
            className="rounded-lg border border-[#dddddd] px-3 py-2 text-left text-sm disabled:opacity-50"
          >
            {option}
          </button>
        ))}
      </div>
      {answered && <p className="mt-3 text-xs text-[#615d59]">Valeu por trocar a rede social pelo estudo!</p>}
    </section>
  );
}
