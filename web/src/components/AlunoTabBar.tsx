export type AlunoTab = 'aula' | 'intercepta' | 'progresso';

interface AlunoTabBarProps {
  active: AlunoTab;
  onChange: (tab: AlunoTab) => void;
  aulaBadge: boolean;
}

const TABS: { id: AlunoTab; label: string; emoji: string }[] = [
  { id: 'aula', label: 'Aula', emoji: '🎓' },
  { id: 'intercepta', label: 'Intercepta', emoji: '🔄' },
  { id: 'progresso', label: 'Progresso', emoji: '📊' },
];

export function AlunoTabBar({ active, onChange, aulaBadge }: AlunoTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line-200 bg-canvas/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-ink-500',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative text-lg" aria-hidden>
                {tab.emoji}
                {tab.id === 'aula' && aulaBadge && (
                  <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-danger-600" />
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
