import GraduationCapIcon from '~icons/twemoji/graduation-cap';
import BooksIcon from '~icons/twemoji/books';

export type ProfessorTab = 'aula' | 'turmas';

interface ProfessorTabBarProps {
  active: ProfessorTab;
  onChange: (tab: ProfessorTab) => void;
}

const TABS: { id: ProfessorTab; label: string; Icon: typeof GraduationCapIcon }[] = [
  { id: 'aula', label: 'Aula', Icon: GraduationCapIcon },
  { id: 'turmas', label: 'Turmas', Icon: BooksIcon },
];

export function ProfessorTabBar({ active, onChange }: ProfessorTabBarProps) {
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
