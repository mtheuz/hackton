import { useState } from 'react';
import type {
  ActivityContent,
  ActivityType,
  AnswerTally,
  LiveActivity,
  LiveSession,
  TeacherClass,
} from '../types/modoAula';

interface ModoAulaProfessorProps {
  classes: TeacherClass[];
  session: LiveSession | null;
  activity: LiveActivity | null;
  tally: AnswerTally;
  onStartSession: (classId: string) => Promise<void>;
  onEndSession: () => Promise<void>;
  onLaunchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

export function ModoAulaProfessor({
  classes,
  session,
  activity,
  tally,
  onStartSession,
  onEndSession,
  onLaunchActivity,
}: ModoAulaProfessorProps) {
  const [type, setType] = useState<ActivityType>('quiz');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [showLauncher, setShowLauncher] = useState(() => !activity);

  if (!session) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-ink-500">Escolha a turma e inicie a aula.</p>
        <div className="mt-3 flex flex-col gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void onStartSession(c.id)}
              className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white active:bg-brand-800"
            >
              Iniciar Modo Aula · {c.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  async function handleLaunch() {
    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (type === 'quiz') {
      await onLaunchActivity('quiz', { question, options: trimmedOptions, correct_index: correctIndex });
    } else if (type === 'poll') {
      await onLaunchActivity('poll', { question, options: trimmedOptions });
    } else {
      await onLaunchActivity('open_question', { question });
    }
    setQuestion('');
    setOptions(['', '']);
    setCorrectIndex(0);
    setShowLauncher(false);
  }

  const needsOptions = type === 'quiz' || type === 'poll';

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <button type="button" onClick={() => void onEndSession()} className="text-xs font-semibold text-danger-600">
          Encerrar aula
        </button>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-widest text-brand-600">{session.code}</p>
      <p className="text-xs text-ink-500">Peça pros alunos entrarem com esse código.</p>

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
            disabled={!question.trim()}
            onClick={() => void handleLaunch()}
            className="mt-2 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Lançar atividade
          </button>
        </div>
      )}
    </section>
  );
}
