import { useState } from 'react';
import type { ActivityContent, ContentTrigger, LiveActivity, LiveSession } from '../types/modoAula';
import type { SessionConfig } from '../types/modoAula';
import { useClassTranscription } from '../hooks/useClassTranscription';
import { QrScannerModal } from './QrScannerModal';
import CameraIcon from '~icons/twemoji/camera';
import PaperclipIcon from '~icons/streamline-emojis/paperclip';

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
  sessionConfig?: SessionConfig | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  initialCode?: string;
  onJoin: (code: string) => Promise<void>;
  onSubmitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  onLeave: () => void;
  onSignalDoubt?: () => Promise<void>;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

function TriggerCard({ trigger }: { trigger: ContentTrigger }) {
  return (
    <section className="rounded-2xl border border-brand-500 bg-brand-50 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">Apresentação do professor</h2>
        <span className="rounded-full bg-brand-100 px-2 py-1 text-[10px] font-semibold text-brand-600">Slide atual</span>
      </div>
      {trigger.textContent && (
        <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink-700">{trigger.textContent}</p>
      )}
      {trigger.fileUrl && (
        <a
          href={trigger.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-11 items-center gap-2 rounded-lg border border-line-200 bg-surface px-3 text-sm font-semibold text-brand-600"
        >
          <PaperclipIcon aria-hidden className="h-4 w-4" />
          {trigger.fileName ?? 'Abrir arquivo'}
        </a>
      )}
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
  sessionConfig,
  answered,
  joining,
  joinError,
  initialCode,
  onJoin,
  onSubmitAnswer,
  onLeave,
  onSignalDoubt = async () => {},
}: ModoAulaAlunoProps) {
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [code, setCode] = useState(initialCode ?? '');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [doubtSent, setDoubtSent] = useState(false);
  const [doubtSending, setDoubtSending] = useState(false);
  const transcription = useClassTranscription(Boolean(sessionConfig?.allowTranscription));

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

  async function handleDoubt() {
    if (doubtSending || doubtSent) return;
    setDoubtSending(true);
    try { await onSignalDoubt(); setDoubtSent(true); } finally { setDoubtSending(false); }
  }

  if (!session) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
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
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line-200 text-xs font-semibold text-ink-700 active:bg-canvas"
        >
          <CameraIcon aria-hidden className="h-4 w-4" />
          Escanear QR do professor
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
          {sessionConfig?.allowTranscription && <section className="mt-3 rounded-xl border border-line-200 bg-canvas p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-ink-700">Gravar e transcrever aula</p><button type="button" onClick={() => void (transcription.recording ? transcription.stop() : transcription.start())} className="min-h-11 rounded-full bg-brand-600 px-3 text-xs font-semibold text-white">{transcription.recording ? 'Parar' : 'Iniciar'}</button></div><p className="mt-2 text-xs text-ink-500">O áudio fica salvo apenas neste navegador.</p>{transcription.unsupported && <p className="mt-2 text-xs text-ink-500">Seu navegador não oferece gravação e transcrição simultâneas.</p>}{transcription.error && <p role="alert" className="mt-2 text-xs text-danger-600">{transcription.error}</p>}{transcription.recording && <p role="status" className="mt-2 text-xs text-brand-600">● Gravando e transcrevendo…</p>}{transcription.recordingUrl && <a href={transcription.recordingUrl} download="fokido-aula.webm" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-line-200 px-3 text-xs font-semibold text-brand-600">Baixar gravação</a>}{transcription.transcript && <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-surface p-3 text-sm leading-relaxed text-ink-700"><p className="mb-1 text-xs font-semibold text-ink-500">Transcrição</p>{transcription.transcript}</div>}</section>}
          <p className="mt-1 text-xs text-ink-500">Aguardando o professor iniciar uma atividade...</p>
          <button type="button" onClick={onLeave} className="mt-3 text-xs font-semibold text-ink-500">
            Sair
          </button>
        </section>
      </div>
    );
  }

  if (session.status === 'finished') {
    return <div className="space-y-4">{contentTrigger && <TriggerCard trigger={contentTrigger} />}<section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm"><h2 className="text-sm font-semibold text-ink-700">Aula encerrada</h2><p className="mt-1 text-xs text-ink-500">Obrigado por participar. O professor encerrou esta sessão.</p>{sessionConfig?.quizAtEnd && activity && <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm font-medium text-brand-700">Quiz final disponível para revisão: {activity.content.question}</div>}</section></div>;
  }

  if (sessionConfig?.quizAtEnd) {
    return <div className="space-y-4">{contentTrigger && <TriggerCard trigger={contentTrigger} />}<section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm"><h2 className="text-sm font-semibold text-ink-700">Quiz da aula</h2><p className="mt-1 text-xs text-ink-500">O quiz será liberado quando o professor encerrar a aula.</p><div className="mt-3 rounded-lg bg-canvas p-3 text-xs text-ink-500">🔒 Atividade reservada para o final</div></section></div>;
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
        {sessionConfig?.allowTranscription && <section className="mt-3 rounded-xl border border-line-200 bg-canvas p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-ink-700">Gravar e transcrever aula</p><button type="button" onClick={() => void (transcription.recording ? transcription.stop() : transcription.start())} className="min-h-11 rounded-full bg-brand-600 px-3 text-xs font-semibold text-white">{transcription.recording ? 'Parar' : 'Iniciar'}</button></div><p className="mt-2 text-xs text-ink-500">O áudio fica salvo apenas neste navegador.</p>{transcription.unsupported && <p className="mt-2 text-xs text-ink-500">Seu navegador não oferece gravação e transcrição simultâneas.</p>}{transcription.error && <p role="alert" className="mt-2 text-xs text-danger-600">{transcription.error}</p>}{transcription.recording && <p role="status" className="mt-2 text-xs text-brand-600">● Gravando e transcrevendo…</p>}{transcription.recordingUrl && <a href={transcription.recordingUrl} download="fokido-aula.webm" className="mt-3 inline-flex min-h-11 items-center rounded-full border border-line-200 px-3 text-xs font-semibold text-brand-600">Baixar gravação</a>}{transcription.transcript && <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-surface p-3 text-sm leading-relaxed text-ink-700"><p className="mb-1 text-xs font-semibold text-ink-500">Transcrição</p>{transcription.transcript}</div>}</section>}
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
                className="min-h-11 rounded-lg border border-line-200 bg-surface px-3 py-2 text-left text-sm text-ink-900 transition-colors active:bg-canvas disabled:opacity-50"
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
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-200 pt-3"><button type="button" onClick={() => void handleDoubt()} disabled={doubtSending || doubtSent} className="min-h-11 rounded-full border border-line-200 px-3 text-xs font-semibold text-ink-700">{doubtSent ? '✓ Dúvida sinalizada' : doubtSending ? 'Enviando…' : '🙋 Sinalizar dúvida'}</button><p className="text-right text-xs text-ink-500">O professor vê apenas a contagem.</p></div>
      </section>
    </div>
  );
}
