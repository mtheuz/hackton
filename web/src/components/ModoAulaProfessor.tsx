import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import GearIcon from '~icons/twemoji/gear';
import MegaphoneIcon from '~icons/twemoji/megaphone';
import type {
  ActivityContent,
  ActivityType,
  AnswerTally,
  ContentTriggerType,
  LiveActivity,
  LiveSession,
  SessionConfig,
  TeacherClass,
} from '../types/modoAula';

interface ModoAulaProfessorProps {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  tally: AnswerTally;
  onStartSession: (classId: string, config: SessionConfig) => Promise<void>;
  onEndSession: () => Promise<void>;
  onLaunchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
  onSendContentTrigger: (type: ContentTriggerType, content: string, accessibilityCaption?: string) => Promise<void>;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

const CONFIG_TOGGLES: { key: keyof SessionConfig; label: string }[] = [
  { key: 'allowNotes', label: 'Permitir anotações' },
  { key: 'allowFreeChatbot', label: 'Permitir chatbot livre' },
  { key: 'focusMode', label: 'Modo foco' },
  { key: 'quizAtEnd', label: 'Quiz ao final' },
  { key: 'accessibilityMode', label: 'Modo acessibilidade' },
];

const DEFAULT_CONFIG: SessionConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

export function ModoAulaProfessor({
  classes,
  session,
  sessionConfig,
  activity,
  tally,
  onStartSession,
  onEndSession,
  onLaunchActivity,
  onSendContentTrigger,
}: ModoAulaProfessorProps) {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [type, setType] = useState<ActivityType>('quiz');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [showLauncher, setShowLauncher] = useState(() => !activity);
  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [ending, setEnding] = useState(false);
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [triggerFormOpen, setTriggerFormOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<ContentTriggerType>('formula');
  const [triggerContent, setTriggerContent] = useState('');
  const [triggerCaption, setTriggerCaption] = useState('');
  const [sendingTrigger, setSendingTrigger] = useState(false);

  if (!session) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-ink-500">Escolha a turma e inicie a aula.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}

        <div className="mt-4 rounded-xl border border-line-200 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <GearIcon aria-hidden className="h-4 w-4" />
            Configurações da sessão
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {CONFIG_TOGGLES.map((toggle) => (
              <label key={toggle.key} className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={config[toggle.key]}
                  onChange={(e) => setConfig({ ...config, [toggle.key]: e.target.checked })}
                />
                {toggle.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={startingClassId !== null}
              onClick={async () => {
                setStartingClassId(c.id);
                setError(null);
                try {
                  await onStartSession(c.id, config);
                } catch {
                  setError('Não foi possível iniciar a aula. Confira sua conexão e tente novamente.');
                } finally {
                  setStartingClassId(null);
                }
              }}
              className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors active:bg-brand-800 disabled:opacity-50"
            >
              {startingClassId === c.id ? 'Iniciando...' : `Iniciar Modo Aula · ${c.name}`}
            </button>
          ))}
        </div>
      </section>
    );
  }

  async function handleLaunch() {
    if (!question.trim() || ((type === 'quiz' || type === 'poll') && (options.some((option) => !option.trim()) || new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length))) return;
    setError(null);
    setLaunching(true);
    try {
      const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
      if (type === 'quiz') {
        await onLaunchActivity('quiz', { question: question.trim(), options: trimmedOptions, correct_index: correctIndex });
      } else if (type === 'poll') {
        await onLaunchActivity('poll', { question: question.trim(), options: trimmedOptions });
      } else {
        await onLaunchActivity('open_question', { question: question.trim() });
      }
      setQuestion('');
      setOptions(['', '']);
      setCorrectIndex(0);
      setShowLauncher(false);
    } catch {
      setError('A atividade não foi enviada. Seus campos foram mantidos para tentar novamente.');
    } finally {
      setLaunching(false);
    }
  }

  async function handleEndSession() {
    if (!window.confirm('Encerrar a aula agora? Os alunos serão desconectados e não vão conseguir responder mais nada.')) {
      return;
    }
    setError(null);
    setEnding(true);
    try {
      await onEndSession();
    } catch {
      setError('Não foi possível encerrar a aula. Tente novamente.');
    } finally {
      setEnding(false);
    }
  }

  async function handleSendTrigger() {
    setError(null);
    setNotice('');
    setSendingTrigger(true);
    try {
      const caption = sessionConfig?.accessibilityMode ? triggerCaption.trim() || undefined : undefined;
      await onSendContentTrigger(triggerType, triggerContent.trim(), caption);
      setTriggerContent('');
      setTriggerCaption('');
      setTriggerFormOpen(false);
      setNotice('Conteúdo enviado para a turma.');
    } catch {
      setError('O conteúdo não foi enviado. Tente novamente.');
    } finally {
      setSendingTrigger(false);
    }
  }

  const needsOptions = type === 'quiz' || type === 'poll';
  const invalidOptions = needsOptions && (options.some((option) => !option.trim()) || new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      {error && <p role="alert" className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-success-50 p-3 text-sm text-success-600">{notice}</p>}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <button
          type="button"
          disabled={ending}
          onClick={() => void handleEndSession()}
          className="text-xs font-semibold text-danger-600 disabled:opacity-50"
        >
          {ending ? 'Encerrando...' : 'Encerrar aula'}
        </button>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-widest text-brand-600">{session.code}</p>
      <p className="text-xs text-ink-500">Peça pros alunos entrarem com esse código ou escanear o QR.</p>
      <div className="mt-3 flex justify-center rounded-xl bg-white p-4">
        <QRCodeSVG value={`${window.location.origin}/aluno?code=${session.code}`} size={192} />
      </div>

      {activity && !showLauncher ? (
        <div className="mt-4 rounded-xl border border-line-200 p-4">
          <p className="text-sm font-medium text-ink-700">{activity.content.question}</p>
          {tally.kind === 'options' ? (
            <ul className="mt-3 space-y-2">
              {(optionsFromContent(activity.content) ?? []).map((option, index) => {
                const total = tally.counts.reduce((a, b) => a + b, 0);
                const count = tally.counts[index] ?? 0;
                const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                return (
                  <li key={option}>
                    <div className="flex justify-between text-xs font-medium text-ink-700">
                      <span>{option}</span>
                      <span>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-canvas">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="mt-3 space-y-1">
              {tally.texts.length === 0 ? (
                <li className="text-xs text-ink-500">Nenhuma resposta ainda.</li>
              ) : (
                tally.texts.map((text, index) => (
                  <li key={index} className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-700">
                    {text}
                  </li>
                ))
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowLauncher(true)}
            className="mt-3 min-h-11 rounded-full border border-line-200 px-4 text-xs font-semibold text-ink-700"
          >
            Nova atividade
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line-200 p-4">
          <label htmlFor="activity-type" className="text-xs font-semibold text-ink-700">
            Tipo
          </label>
          <select
            id="activity-type"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          >
            <option value="quiz">Quiz</option>
            <option value="poll">Enquete</option>
            <option value="open_question">Pergunta aberta</option>
          </select>

          <label htmlFor="activity-question" className="text-xs font-semibold text-ink-700">
            Pergunta
          </label>
          <input
            id="activity-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />

          {needsOptions && (
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  {type === 'quiz' && (
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      aria-label={`Opção ${index + 1} é a correta`}
                    />
                  )}
                  <input
                    value={option}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      setOptions(next);
                    }}
                    aria-label={`Opção ${index + 1}`}
                    placeholder={`Opção ${index + 1}`}
                    className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOptions([...options, ''])}
                className="text-xs font-semibold text-brand-600"
              >
                + Adicionar opção
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={launching || !question.trim() || invalidOptions}
            onClick={() => void handleLaunch()}
            className="mt-2 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {launching ? 'Lançando...' : 'Lançar atividade'}
          </button>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-line-200 p-4">
        <button
          type="button"
          aria-expanded={triggerFormOpen}
          onClick={() => setTriggerFormOpen((open) => !open)}
          className="flex w-full items-center justify-between text-xs font-semibold text-ink-700"
        >
          <span className="flex items-center gap-1.5">
            <MegaphoneIcon aria-hidden className="h-4 w-4" />
            Enviar gatilho de conteúdo
          </span>
          <span aria-hidden className="text-ink-500">
            {triggerFormOpen ? '−' : '+'}
          </span>
        </button>
        {triggerFormOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="trigger-type" className="text-xs font-semibold text-ink-700">
              Tipo
            </label>
            <select
              id="trigger-type"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as ContentTriggerType)}
              className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
            >
              <option value="formula">Fórmula</option>
              <option value="note">Anotação</option>
            </select>
            <label htmlFor="trigger-content" className="text-xs font-semibold text-ink-700">
              Conteúdo
            </label>
            <textarea
              id="trigger-content"
              value={triggerContent}
              onChange={(e) => setTriggerContent(e.target.value)}
              className="min-h-16 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900"
            />
            {sessionConfig?.accessibilityMode && (
              <>
                <label htmlFor="trigger-caption" className="text-xs font-semibold text-ink-700">
                  Legenda de acessibilidade
                </label>
                <input
                  id="trigger-caption"
                  value={triggerCaption}
                  onChange={(e) => setTriggerCaption(e.target.value)}
                  className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
                />
              </>
            )}
            <button
              type="button"
              disabled={sendingTrigger || triggerContent.trim().length === 0}
              onClick={() => void handleSendTrigger()}
              className="mt-1 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sendingTrigger ? 'Enviando...' : 'Enviar gatilho'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
