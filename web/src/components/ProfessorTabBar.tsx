import GraduationCapIcon from '~icons/twemoji/graduation-cap';
import BooksIcon from '~icons/twemoji/books';

export type ProfessorTab = 'dashboard' | 'disciplinas' | 'aulas';

interface ProfessorTabBarProps {
  active: ProfessorTab;
  onChange: (tab: ProfessorTab) => void;
}

const TABS: { id: Exclude<ProfessorTab, 'dashboard'>; label: string; Icon: typeof GraduationCapIcon }[] = [
  { id: 'disciplinas', label: 'Disciplinas', Icon: BooksIcon },
  { id: 'aulas', label: 'Aulas', Icon: GraduationCapIcon },
];

export function ProfessorTabBar({ active, onChange }: ProfessorTabBarProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line-200 bg-canvas/95 pb-safe backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-ink-500',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <tab.Icon aria-hidden className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ProfessorTabBarDesktop({ active, onChange }: ProfessorTabBarProps) {
  return (
    <nav className="hidden md:flex md:justify-center md:gap-1 md:rounded-full md:border md:border-line-200 md:bg-surface md:p-1 md:shadow-sm">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'flex min-h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-colors',
              isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:text-ink-700',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <tab.Icon aria-hidden className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
