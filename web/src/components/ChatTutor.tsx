import { useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useTutorChat } from '../hooks/useTutorChat';
import RobotIcon from '~icons/streamline-emojis/robot-face-1';

interface ChatTutorProps {
  activityId: string;
  onClose: () => void;
}

export function ChatTutor({ activityId, onClose }: ChatTutorProps) {
  const { turns, sending, ask } = useTutorChat(activityId);
  const [question, setQuestion] = useState('');
  const dialogRef = useDialogFocus(onClose);
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const messages = messagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [turns, sending]);

  async function handleSend() {
    if (sending || !question.trim()) return;
    const value = question;
    setQuestion('');
    await ask(value);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={dialogRef}
      aria-label="Tutor Restrito"
      className="fixed inset-0 z-20 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="grym-reveal flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-line-200 bg-surface shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line-200 bg-gradient-to-br from-brand-600 to-brand-700 px-4 py-3.5 text-white">
          <div className="grym-soft-float flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <RobotIcon aria-hidden className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight">Tutor Restrito</h2>
            <p className="mt-0.5 text-xs leading-snug text-white/80">
              IA que não dá a resposta pronta — te ajuda a pensar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grym-button-press -mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/15"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div ref={messagesRef} role="log" aria-live="polite" aria-label="Conversa com o tutor" className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
          {turns.length === 0 && (
            <div className="grym-reveal flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <RobotIcon aria-hidden className="h-7 w-7" />
              </div>
              <p className="text-xs text-ink-500">Pergunta alguma coisa sobre essa atividade.</p>
            </div>
          )}
          {turns.map((turn) => (
            <div key={turn.id} className={`grym-reveal flex items-end gap-2 ${turn.role === 'student' ? 'flex-row-reverse' : ''}`}>
              {turn.role !== 'student' && (
                <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                  <RobotIcon aria-hidden className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={
                  turn.role === 'student'
                    ? 'max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white shadow-sm'
                    : 'max-w-[80%] rounded-2xl rounded-bl-md border border-line-200 bg-surface px-3.5 py-2 text-sm text-ink-700 shadow-sm'
                }
              >
                {turn.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="grym-reveal flex items-end gap-2">
              <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <RobotIcon aria-hidden className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line-200 bg-surface px-3.5 py-2.5 shadow-sm">
                <span className="sr-only">Tutor está pensando...</span>
                <span className="grym-live-pulse h-1.5 w-1.5 rounded-full bg-ink-300 [animation-delay:0ms]" />
                <span className="grym-live-pulse h-1.5 w-1.5 rounded-full bg-ink-300 [animation-delay:150ms]" />
                <span className="grym-live-pulse h-1.5 w-1.5 rounded-full bg-ink-300 [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void handleSend(); }} className="flex gap-2 border-t border-line-200 bg-surface p-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Sua pergunta..."
            aria-label="Sua pergunta"
            className="grym-input-glow min-h-11 flex-1 rounded-full border border-line-200 bg-canvas px-4 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface"
          />
          <button
            type="submit"
            disabled={sending || question.trim().length === 0}
            aria-label="Enviar"
            className="grym-button-press flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <span>Enviar</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M4.5 12l15-7-4 7 4 7-15-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
