import { useEffect, useRef, useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useTutorChat } from '../hooks/useTutorChat';

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
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-surface p-4 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-700">Tutor Restrito</h2>
          <button type="button" onClick={onClose} className="text-xs font-semibold text-ink-500">
            Fechar
          </button>
        </div>
        <p className="mt-1 text-xs text-ink-500">Não dou a resposta pronta — te ajudo a pensar.</p>

        <div ref={messagesRef} role="log" aria-live="polite" aria-label="Conversa com o tutor" className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {turns.length === 0 && <p className="text-xs text-ink-500">Pergunta alguma coisa sobre essa atividade.</p>}
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={
                turn.role === 'student'
                  ? 'ml-auto max-w-[85%] rounded-2xl bg-brand-600 px-3 py-2 text-sm text-white'
                  : 'mr-auto max-w-[85%] rounded-2xl bg-canvas px-3 py-2 text-sm text-ink-700'
              }
            >
              {turn.content}
            </div>
          ))}
          {sending && <p className="text-xs text-ink-500">Tutor está pensando...</p>}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void handleSend(); }} className="mt-3 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Sua pergunta..."
            aria-label="Sua pergunta"
            className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="submit"
            disabled={sending || question.trim().length === 0}
            className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
