import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import GearIcon from '~icons/twemoji/gear';
import MegaphoneIcon from '~icons/twemoji/megaphone';
import ProjectorIcon from '~icons/twemoji/film-projector';
import BarChartIcon from '~icons/twemoji/bar-chart';
import MagnifyingGlassIcon from '~icons/twemoji/magnifying-glass-tilted-right';
import { ToggleSwitch } from './ToggleSwitch';
import { ClassMoodToday } from './ClassMoodToday';
import { SlideFullscreenModal } from './SlideFullscreenModal';
import { CONTENT_FILE_ACCEPT, validateContentFile } from '../lib/contentFile';
import { expandPptxToSlideImages, isPptxFile } from '../lib/pptxSlides';
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
import type { MoodSnapshotBucket } from '../types/intercepta';

interface ModoAulaProfessorProps {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  tally: AnswerTally;
  doubtCount?: number;
  pendingSlides?: LessonSlide[];
  moodBuckets?: MoodSnapshotBucket[];
  moodLoading?: boolean;
  moodIsMock?: boolean;
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
  moodBuckets = [],
  moodLoading = false,
  moodIsMock = false,
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
  const [configFormOpen, setConfigFormOpen] = useState(false);
  const [triggerFormOpen, setTriggerFormOpen] = useState(false);
  const [triggerContent, setTriggerContent] = useState('');
  const [triggerFile, setTriggerFile] = useState<File | null>(null);
  const [triggerFileError, setTriggerFileError] = useState<string | null>(null);
  const [triggerCaption, setTriggerCaption] = useState('');
  const [sendingTrigger, setSendingTrigger] = useState(false);
  const [newAnswerNotice, setNewAnswerNotice] = useState(false);
  const [launchingSlide, setLaunchingSlide] = useState(false);
  const [deckFiles, setDeckFiles] = useState<File[]>([]);
  const [deckFileError, setDeckFileError] = useState<string | null>(null);
  const [expandingPptx, setExpandingPptx] = useState(false);
  const [deckIndex, setDeckIndex] = useState<number | null>(null);
  const [pushingDeckSlide, setPushingDeckSlide] = useState(false);
  const [deckPreviewUrl, setDeckPreviewUrl] = useState<string | null>(null);
  const [deckPreviewExpanded, setDeckPreviewExpanded] = useState(false);
  const previousAnswerCount = useRef(0);

  const deckPreviewFile = deckIndex === null ? null : deckFiles[deckIndex] ?? null;

  useEffect(() => {
    if (!deckPreviewFile) {
      setDeckPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(deckPreviewFile);
    setDeckPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [deckPreviewFile]);

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
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm sm:p-6 lg:p-8">
        <h2 className="text-sm font-semibold text-ink-700 lg:text-base">Modo Aula</h2>
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
          <button
            type="button"
            aria-expanded={configFormOpen}
            onClick={() => setConfigFormOpen((open) => !open)}
            className="flex w-full items-center justify-between text-xs font-semibold text-ink-700"
          >
            <span className="flex items-center gap-1.5">
              <GearIcon aria-hidden className="h-4 w-4" />
              Configurações da sessão
            </span>
            <span aria-hidden className="text-ink-500">
              {configFormOpen ? '−' : '+'}
            </span>
          </button>
          {configFormOpen && (
            <div className="mt-3 flex flex-col gap-2">
              {CONFIG_TOGGLES.map((toggle) => (
                <ToggleSwitch
                  key={toggle.key}
                  label={toggle.label}
                  checked={Boolean(config[toggle.key])}
                  onChange={(checked) => setConfig({ ...config, [toggle.key]: checked })}
                />
              ))}
            </div>
          )}
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

  async function handleDeckFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const valid: File[] = [];
    let firstError: string | null = null;

    for (const file of files) {
      const err = validateContentFile(file);
      if (err) {
        firstError = firstError ?? err;
        continue;
      }
      if (isPptxFile(file)) {
        setExpandingPptx(true);
        try {
          valid.push(...(await expandPptxToSlideImages(file)));
        } catch {
          firstError = firstError ?? 'Não foi possível processar a apresentação. Tente novamente.';
        } finally {
          setExpandingPptx(false);
        }
      } else {
        valid.push(file);
      }
    }

    setDeckFileError(firstError);
    setDeckFiles((prev) => [...prev, ...valid]);
  }

  function handleRemoveDeckFile(index: number) {
    setDeckFiles((prev) => prev.filter((_, i) => i !== index));
    setDeckIndex((prev) => {
      if (prev === null) return prev;
      if (index === prev) return null;
      return index < prev ? prev - 1 : prev;
    });
  }

  function handleClearDeck() {
    setDeckFiles([]);
    setDeckIndex(null);
    setDeckFileError(null);
  }

  async function handlePushDeckSlide(index: number) {
    const file = deckFiles[index];
    if (!file) return;
    setError(null);
    setPushingDeckSlide(true);
    try {
      await onSendContentTrigger('', file);
      setDeckIndex(index);
    } catch {
      setError('Não foi possível exibir esse slide. Tente novamente.');
    } finally {
      setPushingDeckSlide(false);
    }
  }

  const needsOptions = type === 'quiz' || type === 'poll';
  const invalidOptions = needsOptions && (options.some((option) => !option.trim()) || new Set(options.map((option) => option.trim().toLowerCase())).size !== options.length);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm sm:p-6 lg:p-8">
      {error && <p role="alert" className="mb-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-success-50 p-3 text-sm text-success-600">{notice}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-700 lg:text-base">Modo Aula</h2>
        <button
          type="button"
          disabled={ending}
          onClick={() => void handleEndSession()}
          className="text-xs font-semibold text-danger-600 disabled:opacity-50"
        >
          {ending ? 'Encerrando...' : 'Encerrar aula'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr] lg:items-start lg:gap-8">
        <div className="lg:sticky lg:top-20 lg:space-y-3">
          {session.topic && <p className="text-sm font-medium text-ink-700">{session.topic}</p>}
          <p className="mt-2 text-3xl font-bold tracking-widest text-brand-600 lg:mt-0">{session.code}</p>
          <p className="text-xs text-ink-500">Peça pros alunos entrarem com esse código ou escanear o QR.</p>
          <p className="mt-2 text-xs font-semibold text-brand-600 lg:mt-0" aria-live="polite">{doubtCount} {doubtCount === 1 ? 'sinal de dúvida' : 'sinais de dúvida'} da turma</p>
          <div className="mt-3 flex justify-center rounded-xl bg-surface p-4 lg:mt-0 lg:border lg:border-line-200">
            <QRCodeSVG value={`${window.location.origin}/aluno?code=${session.code}`} size={192} />
          </div>

          {!moodLoading && (
            <div className="mt-3 rounded-xl border border-line-200 p-4 lg:mt-0">
              <ClassMoodToday buckets={moodBuckets} loading={moodLoading} isMock={moodIsMock} />
            </div>
          )}

          {pendingSlides && pendingSlides.length > 0 && onLaunchSlide && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line-200 bg-canvas p-3 lg:mt-0 lg:flex-col lg:items-stretch lg:gap-3">
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
        </div>

        <div className="min-w-0 space-y-4">
      {activity && !showLauncher ? (
        <div className="rounded-xl border border-line-200 p-4">
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
        <div className="flex flex-col gap-2 rounded-xl border border-line-200 p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
            <BarChartIcon aria-hidden className="h-4 w-4" />
            Nova atividade
          </h3>
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

      <div className="rounded-xl border border-line-200 p-4">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
          <ProjectorIcon aria-hidden className="h-4 w-4" />
          Slides da aula
        </h3>
        <p className="mt-1 text-xs text-ink-500">
          Anexe imagens, PDFs ou uma apresentação (PPTX) e avance slide a slide — cada um aparece na tela do aluno ao vivo.
        </p>

        <label
          htmlFor="deck-files"
          aria-disabled={expandingPptx}
          className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-brand-50 px-4 text-xs font-semibold text-brand-600 aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          + Anexar slides
        </label>
        <input
          id="deck-files"
          type="file"
          multiple
          disabled={expandingPptx}
          accept={CONTENT_FILE_ACCEPT}
          onChange={(e) => void handleDeckFilesChange(e)}
          className="hidden"
        />
        {expandingPptx && (
          <p role="status" className="mt-2 text-xs font-semibold text-brand-600">
            Processando apresentação...
          </p>
        )}
        {deckFileError && (
          <p role="alert" className="mt-2 text-xs text-danger-600">
            {deckFileError}
          </p>
        )}

        {deckFiles.length > 0 && (
          <>
            <ul className="mt-3 flex flex-col gap-1.5">
              {deckFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className={[
                    'flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs',
                    deckIndex === index ? 'bg-brand-50 font-semibold text-brand-600' : 'bg-canvas text-ink-700',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {index + 1}. {file.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ${file.name}`}
                    onClick={() => handleRemoveDeckFile(index)}
                    className="shrink-0 text-danger-600"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            {deckPreviewFile && deckPreviewUrl && (
              <div className="relative mt-3 overflow-hidden rounded-lg border border-line-200 bg-canvas">
                {deckPreviewFile.type.startsWith('image/') ? (
                  <img src={deckPreviewUrl} alt={deckPreviewFile.name} className="w-full" />
                ) : deckPreviewFile.type === 'application/pdf' ? (
                  <iframe title={deckPreviewFile.name} src={deckPreviewUrl} className="h-64 w-full" />
                ) : (
                  <p className="p-3 text-xs text-ink-500">{deckPreviewFile.name}</p>
                )}
                {(deckPreviewFile.type.startsWith('image/') || deckPreviewFile.type === 'application/pdf') && (
                  <button
                    type="button"
                    aria-label="Expandir slide"
                    onClick={() => setDeckPreviewExpanded(true)}
                    className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow-sm"
                  >
                    <MagnifyingGlassIcon aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            {deckPreviewExpanded && deckPreviewFile && deckPreviewUrl && (
              <SlideFullscreenModal
                url={deckPreviewUrl}
                fileType={deckPreviewFile.type}
                fileName={deckPreviewFile.name}
                onClose={() => setDeckPreviewExpanded(false)}
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={pushingDeckSlide || deckIndex === null || deckIndex <= 0}
                onClick={() => void handlePushDeckSlide((deckIndex ?? 0) - 1)}
                className="min-h-11 rounded-full border border-line-200 px-4 text-xs font-semibold text-ink-700 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs text-ink-500">
                {deckIndex === null
                  ? `${deckFiles.length} slide${deckFiles.length > 1 ? 's' : ''} pronto${deckFiles.length > 1 ? 's' : ''}`
                  : `Slide ${deckIndex + 1} de ${deckFiles.length}`}
              </span>
              <button
                type="button"
                disabled={pushingDeckSlide || (deckIndex ?? -1) >= deckFiles.length - 1}
                onClick={() => void handlePushDeckSlide((deckIndex ?? -1) + 1)}
                className="min-h-11 rounded-full bg-brand-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
              >
                {pushingDeckSlide ? 'Enviando...' : deckIndex === null ? 'Apresentar' : 'Próximo'}
              </button>
            </div>

            <button type="button" onClick={handleClearDeck} className="mt-2 text-xs font-semibold text-ink-500">
              Remover apresentação
            </button>
          </>
        )}
      </div>

      <div className="rounded-xl border border-line-200 p-4">
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
        </div>
      </div>
    </section>
  );
}
