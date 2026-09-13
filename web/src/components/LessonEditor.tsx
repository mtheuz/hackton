import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { CONTENT_FILE_ACCEPT, validateContentFile } from '../lib/contentFile';
import { useLessonSlides } from '../hooks/useLessonSlides';
import type { ActivityType } from '../types/modoAula';
import type { Lesson, LessonConfig, LessonSlide, SlideType } from '../types/lesson';

interface LessonEditorProps {
  lesson: Lesson;
  onUpdateLesson: (name: string, subject: string, config: LessonConfig) => Promise<void>;
  onClose: () => void;
}

const CONFIG_TOGGLES: { key: keyof LessonConfig; label: string }[] = [
  { key: 'allowNotes', label: 'Permitir anotações' },
  { key: 'allowFreeChatbot', label: 'Permitir chatbot livre' },
  { key: 'focusMode', label: 'Modo foco' },
  { key: 'accessibilityMode', label: 'Modo acessibilidade' },
];

function slideSummary(slide: LessonSlide): string {
  if (slide.type === 'material') {
    return slide.textContent || slide.fileName || 'Material sem conteúdo';
  }
  return slide.content && 'question' in slide.content ? slide.content.question : 'Sem pergunta';
}

function slideTypeLabel(type: SlideType): string {
  switch (type) {
    case 'quiz':
      return 'Quiz';
    case 'poll':
      return 'Enquete';
    case 'open_question':
      return 'Pergunta aberta';
    case 'material':
      return 'Material';
  }
}

export function LessonEditor({ lesson, onUpdateLesson, onClose }: LessonEditorProps) {
  const { slides, loading, addActivitySlide, addMaterialSlide, removeSlide, moveSlide } = useLessonSlides(lesson.id);

  const [name, setName] = useState(lesson.name);
  const [subject, setSubject] = useState(lesson.subject);
  const [config, setConfig] = useState<LessonConfig>(lesson.config);
  const [savingDetails, setSavingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slideType, setSlideType] = useState<SlideType>('quiz');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [materialText, setMaterialText] = useState('');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [materialFileError, setMaterialFileError] = useState<string | null>(null);
  const [addingSlide, setAddingSlide] = useState(false);

  const needsOptions = slideType === 'quiz' || slideType === 'poll';
  const invalidOptions =
    needsOptions &&
    (options.some((o) => !o.trim()) ||
      new Set(options.map((o) => o.trim().toLowerCase())).size !== options.length);

  async function handleSaveDetails() {
    setError(null);
    setSavingDetails(true);
    try {
      await onUpdateLesson(name.trim(), subject.trim(), config);
    } catch {
      setError('Não foi possível salvar a aula. Tente novamente.');
    } finally {
      setSavingDetails(false);
    }
  }

  function resetSlideForm() {
    setQuestion('');
    setOptions(['', '']);
    setCorrectIndex(0);
    setMaterialText('');
    setMaterialFile(null);
    setMaterialFileError(null);
  }

  function handleMaterialFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setMaterialFile(null);
      setMaterialFileError(null);
      return;
    }
    const err = validateContentFile(file);
    if (err) {
      setMaterialFileError(err);
      setMaterialFile(null);
      e.target.value = '';
      return;
    }
    setMaterialFileError(null);
    setMaterialFile(file);
  }

  async function handleAddSlide() {
    setError(null);
    setAddingSlide(true);
    try {
      if (slideType === 'material') {
        await addMaterialSlide({ textContent: materialText.trim(), file: materialFile });
      } else {
        const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
        const content =
          slideType === 'quiz'
            ? { question: question.trim(), options: trimmedOptions, correct_index: correctIndex }
            : slideType === 'poll'
              ? { question: question.trim(), options: trimmedOptions }
              : { question: question.trim() };
        await addActivitySlide(slideType as ActivityType, content);
      }
      resetSlideForm();
    } catch {
      setError('Não foi possível adicionar o slide. Tente novamente.');
    } finally {
      setAddingSlide(false);
    }
  }

  const canAddSlide =
    slideType === 'material' ? materialText.trim().length > 0 || materialFile !== null : question.trim().length > 0 && !invalidOptions;

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">Editar aula</h2>
        <button type="button" onClick={onClose} className="text-xs font-semibold text-ink-500">
          Fechar
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger-600">{error}</p>}

      <div className="mt-3 flex flex-col gap-2">
        <label htmlFor="lesson-name" className="text-xs font-semibold text-ink-700">
          Nome
        </label>
        <input
          id="lesson-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
        />
        <label htmlFor="lesson-subject" className="text-xs font-semibold text-ink-700">
          Assunto
        </label>
        <input
          id="lesson-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Frações"
          className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
        />
      </div>

      <div className="mt-4 rounded-xl border border-line-200 p-4">
        <h3 className="text-xs font-semibold text-ink-700">Configuração da aula</h3>
        <div className="mt-2 flex flex-col gap-2">
          {CONFIG_TOGGLES.map((toggle) => (
            <ToggleSwitch
              key={toggle.key}
              label={toggle.label}
              checked={config[toggle.key]}
              onChange={(checked) => setConfig({ ...config, [toggle.key]: checked })}
            />
          ))}
        </div>
        {config.focusMode && (
          <p className="mt-2 text-xs text-ink-500">
            Modo foco deixa a tela cheia e monitora se o aluno saiu do app — não silencia o celular (limite de PWA).
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={savingDetails || !name.trim() || !subject.trim()}
        onClick={() => void handleSaveDetails()}
        className="mt-3 min-h-11 w-full rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {savingDetails ? 'Salvando...' : 'Salvar aula'}
      </button>

      <h3 className="mt-5 text-xs font-semibold text-ink-700">Apresentação ({slides.length} slides)</h3>
      {!loading && (
        <ul className="mt-2 space-y-2">
          {slides.map((slide, index) => (
            <li key={slide.id} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2">
              <span className="flex-1 text-xs text-ink-700">
                <span className="font-semibold">{slideTypeLabel(slide.type)}:</span> {slideSummary(slide)}
              </span>
              <button
                type="button"
                aria-label={`Mover slide ${index + 1} para cima`}
                disabled={index === 0}
                onClick={() => void moveSlide(slide.id, 'up')}
                className="text-ink-500 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Mover slide ${index + 1} para baixo`}
                disabled={index === slides.length - 1}
                onClick={() => void moveSlide(slide.id, 'down')}
                className="text-ink-500 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remover slide ${index + 1}`}
                onClick={() => void removeSlide(slide.id)}
                className="text-xs font-semibold text-danger-600"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line-200 p-4">
        <label htmlFor="slide-type" className="text-xs font-semibold text-ink-700">
          Novo slide
        </label>
        <select
          id="slide-type"
          value={slideType}
          onChange={(e) => setSlideType(e.target.value as SlideType)}
          className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
        >
          <option value="quiz">Quiz</option>
          <option value="poll">Enquete</option>
          <option value="open_question">Pergunta aberta</option>
          <option value="material">Material (arquivo/texto)</option>
        </select>

        {slideType === 'material' ? (
          <>
            <label htmlFor="slide-material-file" className="text-xs font-semibold text-ink-700">
              Arquivo (JPG, PDF, DOC ou DOCX)
            </label>
            <input
              id="slide-material-file"
              type="file"
              accept={CONTENT_FILE_ACCEPT}
              onChange={handleMaterialFileChange}
              className="text-sm text-ink-700 file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:text-sm file:font-semibold file:text-brand-600"
            />
            {materialFile && <p className="text-xs text-ink-500">Selecionado: {materialFile.name}</p>}
            {materialFileError && (
              <p role="alert" className="text-xs text-danger-600">
                {materialFileError}
              </p>
            )}
            <label htmlFor="slide-material-text" className="text-xs font-semibold text-ink-700">
              Texto
            </label>
            <textarea
              id="slide-material-text"
              value={materialText}
              onChange={(e) => setMaterialText(e.target.value)}
              className="min-h-16 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
            />
          </>
        ) : (
          <>
            <label htmlFor="slide-question" className="text-xs font-semibold text-ink-700">
              Pergunta
            </label>
            <input
              id="slide-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
            />
            {needsOptions && (
              <div className="flex flex-col gap-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {slideType === 'quiz' && (
                      <input
                        type="radio"
                        name="slide-correct-option"
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
          </>
        )}

        <button
          type="button"
          disabled={addingSlide || !canAddSlide}
          onClick={() => void handleAddSlide()}
          className="mt-1 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {addingSlide ? 'Adicionando...' : 'Adicionar slide'}
        </button>
      </div>
    </section>
  );
}
