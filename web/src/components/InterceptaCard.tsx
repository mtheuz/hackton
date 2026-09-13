import { useEffect, useRef, useState } from 'react';
import type { PendingMission } from '../types/intercepta';

interface InterceptaCardProps {
  mission: PendingMission | null;
  loading?: boolean;
  completedCount: number;
  onAnswer: (answer: number | { text: string; fileName?: string }) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const [frozenMission, setFrozenMission] = useState<PendingMission | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openAnswer, setOpenAnswer] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const requestedRef = useRef(false);

  const displayedMission = showFeedback || submitting ? frozenMission ?? incomingMission : incomingMission;

  useEffect(() => {
    if (loading || incomingMission || requestedRef.current) return;
    requestedRef.current = true;
    void handleSimulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, incomingMission]);

  async function handleAnswer(answer: number | { text: string; fileName?: string }) {
    const index = typeof answer === 'number' ? answer : null;
    setFrozenMission(incomingMission);
    setSelectedIndex(index);
    setError(null);
    setSubmitting(true);
    try {
      await onAnswer(answer);
      setShowFeedback(true);
      timer.current = setTimeout(() => setShowFeedback(false), FEEDBACK_DISPLAY_MS);
    } catch {
      setError('Não foi possível salvar sua resposta. Tente novamente.');
      setSelectedIndex(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimulate() {
    setError(null);
    setFrozenMission(null);
    setSubmitting(true);
    try {
      await onSimulateImpulse();
    } catch {
      setError('Não foi possível buscar um desafio. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!displayedMission) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        {error && <p role="alert" className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}
        <p className="text-sm font-medium text-ink-700">
          Trocas de impulso por estudo: {completedCount}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {loading || submitting ? 'Carregando desafio...' : 'Sem missão agora. Quando um impulso surgir, ela aparece aqui.'}
        </p>
      </section>
    );
  }

  const mission = displayedMission;
  const isOpen = mission.content.answer_type === 'open' || !mission.content.options?.length;
  const isCorrect = selectedIndex !== null && selectedIndex === mission.content.correct_index;

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm" aria-live="polite">
      {error && <p role="alert" className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}
      {submitting && <p role="status" className="mb-3 text-sm text-ink-500">Salvando sua resposta…</p>}
      <section className="challenge-question-3d rounded-xl border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{mission.content.subject}</p>
        <p className="mt-1 text-sm font-medium text-ink-700">{mission.content.question}</p>
      </section>
      <section className="mt-3 rounded-xl border border-line-200 p-4">
        <p className="mb-3 text-xs font-semibold text-ink-500">Sua resposta</p>
      {isOpen ? <div className="mt-3 flex flex-col gap-2"><textarea value={openAnswer} onChange={(event) => setOpenAnswer(event.target.value)} disabled={submitting || showFeedback} aria-label="Resposta aberta" placeholder="Escreva sua resposta..." className="min-h-24 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900" /><label className="flex min-h-11 items-center gap-2 rounded-lg border border-line-200 px-3 text-xs font-semibold text-ink-700"><span>📎 Anexar arquivo</span><input type="file" className="sr-only" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />{attachment && <span className="truncate font-normal text-ink-500">{attachment.name}</span>}</label><button type="button" disabled={submitting || !openAnswer.trim()} onClick={() => void handleAnswer({ text: openAnswer.trim(), fileName: attachment?.name })} className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white">{submitting ? 'Enviando...' : 'Enviar resposta'}</button></div> : <div className="mt-3 flex flex-col gap-2">
        {(mission.content.options ?? []).map((option, index) => {
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
      </div>}
      {showFeedback && (
        <p className={`mt-3 text-xs font-medium ${isCorrect ? 'text-success-600' : 'text-danger-600'}`}>
          {isCorrect
            ? `Valeu por trocar a rede social pelo estudo! +${mission.content.pf_reward} PF`
            : 'Quase! A resposta certa está destacada acima.'}
        </p>
      )}
      </section>
    </section>
  );
}
