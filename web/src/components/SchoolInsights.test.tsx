import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SchoolInsights } from './SchoolInsights';

describe('SchoolInsights', () => {
  it('shows the empty state when there are no days with enough data', () => {
    render(<SchoolInsights signals={[]} loading={false} />);
    expect(screen.getByText(/Ainda sem dados suficientes/)).toBeInTheDocument();
  });

  it('renders summary totals and a per-day breakdown', () => {
    render(
      <SchoolInsights
        signals={[
          { day: '2026-09-10', metric: 'mood_avg', value: 3.5, sampleSize: 8 },
          { day: '2026-09-10', metric: 'trocas_impulso', value: 5, sampleSize: 5 },
          { day: '2026-09-11', metric: 'mood_avg', value: 4.0, sampleSize: 6 },
          { day: '2026-09-11', metric: 'modo_aula_respostas', value: 9, sampleSize: 9 },
        ]}
        loading={false}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('10/09')).toBeInTheDocument();
    expect(screen.getByText('11/09')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    render(<SchoolInsights signals={[]} loading={true} />);
    expect(screen.getByText(/Carregando/)).toBeInTheDocument();
  });
});
