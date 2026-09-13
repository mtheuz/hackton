import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import GearIcon from '~icons/twemoji/gear';
import MegaphoneIcon from '~icons/twemoji/megaphone';
import { ToggleSwitch } from './ToggleSwitch';
import { CONTENT_FILE_ACCEPT, validateContentFile } from '../lib/contentFile';
import type {
  ActivityContent,
  ActivityType,
  AnswerTally,
  LiveActivity,
  LiveSession,
  SessionConfig,
  TeacherClass,
} from '../types/modoAula';
import type { LessonSlide } from '../types/lesson';

interface ModoAulaProfessorProps {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  tally: AnswerTally;
  doubtCount?: number;
  pendingSlides?: LessonSlide[];
  onStartSession: (classId: string, config: SessionConfig, topic: string) => Promise<void>;
  onEndSession: () => Promise<void>;
  onLaunchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
  onLaunchSlide?: (slide: LessonSlide) => Promise<void>;
  onSendContentTrigger: (textContent: string, file: File | null, accessibilityCaption?: string) => Promise<void>;
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
  { key: 'allowTranscription', label: 'Permitir gravação e transcrição' },
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
  doubtCount = 0,
  pendingSlides,
  onStartSession,
  onEndSession,
  onLaunchActivity,
  onLaunchSlide,
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
  const [topic, setTopic] = useState('');
  const [triggerFormOpen, setTriggerFormOpen] = useState(false);
  const [triggerContent, setTriggerContent] = useState('');
  const [triggerFile, setTriggerFile] = useState<File | null>(null);
  const [triggerFileError, setTriggerFileError] = useState<string | null>(null);
  const [triggerCaption, setTriggerCaption] = useState('');
  const [sendingTrigger, setSendingTrigger] = useState(false);
  const [newAnswerNotice, setNewAnswerNotice] = useState(false);
  const [launchingSlide, setLaunchingSlide] = useState(false);
  const previousAnswerCount = useRef(0);

  const answerCount = tally.kind === 'options' ? tally.counts.reduce((a, b) => a + b, 0) : tally.texts.length;

  useEffect(() => {
    if (answerCount > previousAnswerCount.current) {
      setNewAnswerNotice(true);
      const timer = setTimeout(() => setNewAnswerNotice(false), 3000);
      previousAnswerCount.current = answerCount;
      return () => clearTimeout(timer);
    }
    previousAnswerCount.current = answerCount;
  }, [answerCount]);

  if (!session) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-ink-500">Escolha a turma e inicie a aula.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="session-topic" className="text-xs font-semibold text-ink-700">
            Tema da aula
          </label>
          <input
            id="session-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: Frações, Segunda Guerra Mundial..."
            className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div className="mt-4 rounded-xl border border-line-200 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <GearIcon aria-hidden className="h-4 w-4" />
            Configurações da sessão
          </h3>
          <div className="mt-2 flex flex-col gap-2">
            {CONFIG_TOGGLES.map((toggle) => (
              <ToggleSwitch
                key={toggle.key}
                label={toggle.label}
                checked={Boolean(config[toggle.key])}
                onChange={(checked) => setConfig({ ...config, [toggle.key]: checked })}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={startingClassId !== null || !topic.trim()}
              onClick={async () => {
                setStartingClassId(c.id);
                setError(null);
                try {
                  await onStartSession(c.id, config, topic.trim());
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

  async function handleLaunchNextSlide() {
    const next = pendingSlides?.[0];
    if (!next || !onLaunchSlide) return;
    setError(null);
    setLaunchingSlide(true);
    try {
      await onLaunchSlide(next);
    } catch {
      setError('Não foi possível avançar o slide. Tente novamente.');
    } finally {
      setLaunchingSlide(false);
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
      await onSendContentTrigger(triggerContent.trim(), triggerFile, caption);
      setTriggerContent('');
      setTriggerFile(null);
      setTriggerFileError(null);
      setTriggerCaption('');
      setTriggerFormOpen(false);
      setNotice('Material enviado para a turma.');
    } catch {
      setError('O material não foi enviado. Tente novamente.');
    } finally {
      setSendingTrigger(false);
    }
  }

  function handleTriggerFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setTriggerFile(null);
      setTriggerFileError(null);
      return;
    }
    const err = validateContentFile(file);
    if (err) {
      setTriggerFileError(err);
      setTriggerFile(null);
      e.target.value = '';
      return;
    }
    setTriggerFileError(null);
    setTriggerFile(file);
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
      {session.topic && <p className="mt-1 text-sm font-medium text-ink-700">{session.topic}</p>}
      <p className="mt-2 text-3xl font-bold tracking-widest text-brand-600">{session.code}</p>
      <p className="text-xs text-ink-500">Peça pros alunos entrarem com esse código ou escanear o QR.</p>
      <p className="mt-2 text-xs font-semibold text-brand-600" aria-live="polite">{doubtCount} {doubtCount === 1 ? 'sinal de dúvida' : 'sinais de dúvida'} da turma</p>
      <div className="mt-3 flex justify-center rounded-xl bg-surface p-4">
        <QRCodeSVG value={`${window.location.origin}/aluno?code=${session.code}`} size={192} />
      </div>

      {pendingSlides && pendingSlides.length > 0 && onLaunchSlide && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line-200 bg-canvas p-3">
          <p className="text-xs text-ink-700">
            Próximo slide da aula ({pendingSlides.length} restante{pendingSlides.length > 1 ? 's' : ''})
          </p>
          <button
            type="button"
            disabled={launchingSlide}
            onClick={() => void handleLaunchNextSlide()}
            className="min-h-11 shrink-0 rounded-full bg-brand-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
          >
            {launchingSlide ? 'Lançando...' : 'Avançar'}
          </button>
        </div>
      )}

      {activity && !showLauncher ? (
        <div className="mt-4 rounded-xl border border-line-200 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-700">{activity.content.question}</p>
            {newAnswerNotice && (
              <span
                role="status"
                className="shrink-0 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600"
              >
                Nova resposta!
              </span>
            )}
          </div>
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
            Enviar material de conteúdo
          </span>
          <span aria-hidden className="text-ink-500">
            {triggerFormOpen ? '−' : '+'}
          </span>
        </button>
        {triggerFormOpen && (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="trigger-file" className="text-xs font-semibold text-ink-700">
              Arquivo (JPG, PDF, DOC ou DOCX)
            </label>
            <input
              id="trigger-file"
              type="file"
              accept={CONTENT_FILE_ACCEPT}
              onChange={handleTriggerFileChange}
              className="text-sm text-ink-700 file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:text-sm file:font-semibold file:text-brand-600"
            />
            {triggerFile && <p className="text-xs text-ink-500">Selecionado: {triggerFile.name}</p>}
            {triggerFileError && (
              <p role="alert" className="text-xs text-danger-600">
                {triggerFileError}
              </p>
            )}
            <label htmlFor="trigger-content" className="text-xs font-semibold text-ink-700">
              Texto
            </label>
            <textarea
              id="trigger-content"
              value={triggerContent}
              onChange={(e) => setTriggerContent(e.target.value)}
              placeholder="Mensagem opcional pra turma..."
              className="min-h-16 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
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
                  className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
                />
              </>
            )}
            <button
              type="button"
              disabled={sendingTrigger || (triggerContent.trim().length === 0 && !triggerFile)}
              onClick={() => void handleSendTrigger()}
              className="mt-1 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {sendingTrigger ? 'Enviando...' : 'Enviar material'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
