import { useState } from 'react';
import type { ActivityContent, LiveActivity, LiveSession } from '../types/modoAula';

interface ModoAulaAlunoProps {
  session: LiveSession | null;
  activity: LiveActivity | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  onJoin: (code: string) => Promise<void>;
  onSubmitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  onLeave: () => void;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

export function ModoAulaAluno({
  session,
  activity,
  answered,
  joining,
  joinError,
  onJoin,
  onSubmitAnswer,
  onLeave,
}: ModoAulaAlunoProps) {
  const [code, setCode] = useState('');
  const [text, setText] = useState('');

  if (!session || session.status === 'finished') {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        {session?.status === 'finished' && (
          <p className="mt-1 text-xs text-ink-500">Aula encerrada. Até a próxima!</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={4}
            placeholder="Código da aula"
            aria-label="Código da aula"
            className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="button"
            disabled={joining || code.trim().length === 0}
            onClick={() => void onJoin(code.trim())}
            className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Entrar na aula
          </button>
        </div>
        {joinError && <p className="mt-2 text-xs text-danger-600">{joinError}</p>}
      </section>
    );
  }

  if (!activity) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-ink-500">Aguardando o professor iniciar uma atividade...</p>
        <button type="button" onClick={onLeave} className="mt-3 text-xs font-semibold text-ink-500">
          Sair
        </button>
      </section>
    );
  }

  if (answered) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-success-600">Resposta enviada! Aguardando o professor.</p>
      </section>
    );
  }

  const options = optionsFromContent(activity.content);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
      <p className="mt-1 text-sm font-medium text-ink-700">{activity.content.question}</p>
      {options ? (
        <div className="mt-3 flex flex-col gap-2">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => void onSubmitAnswer({ selectedIndex: index })}
              className="min-h-11 rounded-lg border border-line-200 px-3 py-2 text-left text-sm active:bg-canvas"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-20 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="button"
            disabled={text.trim().length === 0}
            onClick={() => void onSubmitAnswer({ text: text.trim() })}
            className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      )}
    </section>
  );
}
