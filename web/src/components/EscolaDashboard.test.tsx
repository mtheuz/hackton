import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EscolaDashboard } from './EscolaDashboard';

describe('EscolaDashboard', () => {
  it('shows the empty state when no group meets the k-anonymity threshold', () => {
    render(<EscolaDashboard moodStats={[]} engagementStats={[]} loading={false} />);
    expect(screen.getByText(/Sem dados suficientes/)).toBeInTheDocument();
  });

  it('renders aggregated mood and engagement totals', () => {
    render(
      <EscolaDashboard
        moodStats={[
          { classId: 'class-1', day: '2026-09-10', mood: 'bem', studentCount: 4 },
          { classId: 'class-1', day: '2026-09-11', mood: 'bem', studentCount: 3 },
        ]}
        engagementStats={[
          { classId: 'class-1', day: '2026-09-10', eventType: 'intercepta_mission', studentCount: 5 },
        ]}
        loading={false}
      />,
    );

    expect(screen.getByText('7 alunos')).toBeInTheDocument();
    expect(screen.getByText('Trocas de impulso por estudo')).toBeInTheDocument();
    expect(screen.getByText('5 alunos')).toBeInTheDocument();
  });
});
