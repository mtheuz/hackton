import { useState } from 'react';
import type { ActivityContent, ContentTrigger, LiveActivity, LiveSession } from '../types/modoAula';
import { QrScannerModal } from './QrScannerModal';

function codeFromScan(value: string): string {
  try {
    return new URL(value).searchParams.get('code') ?? value;
  } catch {
    return value;
  }
}

interface ModoAulaAlunoProps {
  session: LiveSession | null;
  activity: LiveActivity | null;
  contentTrigger: ContentTrigger | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  initialCode?: string;
  onJoin: (code: string) => Promise<void>;
  onSubmitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  onLeave: () => void;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

function TriggerCard({ trigger }: { trigger: ContentTrigger }) {
  return (
    <section className="rounded-2xl border border-brand-500 bg-brand-50 p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {trigger.type === 'formula' ? 'Fórmula' : 'Anotação'} do professor
      </h2>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink-700">{trigger.content}</p>
      {trigger.accessibilityCaption && (
        <p className="mt-2 text-xs italic text-ink-500">{trigger.accessibilityCaption}</p>
      )}
    </section>
  );
}

export function ModoAulaAluno({
  session,
  activity,
  contentTrigger,
  answered,
  joining,
  joinError,
  initialCode,
  onJoin,
  onSubmitAnswer,
  onLeave,
}: ModoAulaAlunoProps) {
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [code, setCode] = useState(initialCode ?? '');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  async function handleAnswer(payload: { selectedIndex?: number; text?: string }) {
    setAnswerError(null);
    setSubmitting(true);
    try {
      await onSubmitAnswer(payload);
    } catch {
      setAnswerError('Sua resposta não foi enviada. Confira a conexão e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleScan(rawValue: string) {
    const scannedCode = codeFromScan(rawValue).trim();
    setScannerOpen(false);
    setCode(scannedCode);
    if (scannedCode) void onJoin(scannedCode);
  }

  if (!session || session.status === 'finished') {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        {session?.status === 'finished' && (
          <p className="mt-1 text-xs text-ink-500">Aula encerrada. Até a próxima!</p>
        )}
        <form onSubmit={(event) => { event.preventDefault(); if (!joining && /^\d{4}$/.test(code)) void onJoin(code); }} className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{4}"
            disabled={joining}
            maxLength={4}
            placeholder="Código da aula"
            aria-label="Código da aula"
            className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="submit"
            disabled={joining || !/^\d{4}$/.test(code)}
            className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {joining ? 'Entrando...' : 'Entrar na aula'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="mt-2 min-h-11 w-full rounded-lg border border-line-200 text-xs font-semibold text-ink-700 active:bg-canvas"
        >
          📷 Escanear QR do professor
        </button>
        {joinError && <p role="alert" className="mt-2 text-xs text-danger-600">{joinError}</p>}
        {scannerOpen && <QrScannerModal onScan={handleScan} onClose={() => setScannerOpen(false)} />}
      </section>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-4">
        {contentTrigger && <TriggerCard trigger={contentTrigger} />}
        <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
          {session.topic && <p className="mt-1 text-sm font-medium text-ink-700">{session.topic}</p>}
          <p className="mt-1 text-xs text-ink-500">Aguardando o professor iniciar uma atividade...</p>
          <button type="button" onClick={onLeave} className="mt-3 text-xs font-semibold text-ink-500">
            Sair
          </button>
        </section>
      </div>
    );
  }

  if (answered) {
    return (
      <div className="space-y-4">
        {contentTrigger && <TriggerCard trigger={contentTrigger} />}
        <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
          <p role="status" className="mt-1 text-xs text-success-600">Resposta enviada! Aguardando o professor.</p>
        </section>
      </div>
    );
  }

  const options = optionsFromContent(activity.content);

  return (
    <div className="space-y-4">
      {contentTrigger && <TriggerCard trigger={contentTrigger} />}
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-sm font-medium text-ink-700">{activity.content.question}</p>
        {answerError && <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{answerError}</p>}
        {options ? (
          <div className="mt-3 flex flex-col gap-2">
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                disabled={submitting}
                onClick={() => void handleAnswer({ selectedIndex: index })}
                className="min-h-11 rounded-lg border border-line-200 px-3 py-2 text-left text-sm transition-colors active:bg-canvas disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              aria-label="Sua resposta"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              className="min-h-20 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={submitting || text.trim().length === 0}
              onClick={() => void handleAnswer({ text: text.trim() })}
              className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
