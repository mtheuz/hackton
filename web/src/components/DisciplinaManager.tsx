import { useState } from 'react';
import MemoIcon from '~icons/twemoji/memo';
import type { Discipline } from '../types/disciplina';

interface DisciplinaManagerProps {
  disciplines: Discipline[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}

export function DisciplinaManager({ disciplines, onCreate, onRename }: DisciplinaManagerProps) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    setName('');
  }

  async function handleRename(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await onRename(id, trimmed);
    setEditingId(null);
  }

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-700">
        <MemoIcon aria-hidden className="h-4 w-4" />
        Disciplinas
      </h2>
      <ul className="mt-3 space-y-2">
        {disciplines.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            {editingId === d.id ? (
              <>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  aria-label={`Renomear ${d.name}`}
                  className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
                />
                <button
                  type="button"
                  onClick={() => void handleRename(d.id)}
                  className="text-xs font-semibold text-brand-600"
                >
                  Salvar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink-700">{d.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(d.id);
                    setEditingName(d.name);
                  }}
                  className="text-xs font-semibold text-ink-500"
                >
                  Renomear
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova disciplina"
          aria-label="Nova disciplina"
          className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
        />
        <button
          type="button"
          disabled={name.trim().length === 0}
          onClick={() => void handleCreate()}
          className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Criar
        </button>
      </div>
    </section>
  );
}
