import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleBarChart } from './SimpleBarChart';

describe('SimpleBarChart', () => {
  it('shows the empty message when there are no bars', () => {
    render(<SimpleBarChart title="Seu progresso" bars={[]} emptyMessage="Ainda sem dados." />);
    expect(screen.getByText('Ainda sem dados.')).toBeInTheDocument();
  });

  it('exposes every bar as a row in the accessible table twin', () => {
    render(
      <SimpleBarChart
        title="Seu progresso"
        bars={[
          { key: 'matematica', label: 'Matemática', value: 30, displayValue: '30 PF' },
          { key: 'portugues', label: 'Português', value: 10, displayValue: '10 PF' },
        ]}
        emptyMessage="Ainda sem dados."
      />,
    );

    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('Matemática');
    expect(table).toHaveTextContent('30 PF');
    expect(table).toHaveTextContent('Português');
    expect(table).toHaveTextContent('10 PF');
  });

  it('sizes the tallest bar at 100% height and scales the rest relative to it', () => {
    render(
      <SimpleBarChart
        title="Seu progresso"
        bars={[
          { key: 'a', label: 'A', value: 10, displayValue: '10' },
          { key: 'b', label: 'B', value: 20, displayValue: '20' },
        ]}
        emptyMessage="Ainda sem dados."
      />,
    );

    const bars = document.querySelectorAll('[data-bar-fill]');
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveStyle({ height: '50%' });
    expect(bars[1]).toHaveStyle({ height: '100%' });
  });

  it('hides the visual bars from assistive tech since the table carries the same data', () => {
    const { container } = render(
      <SimpleBarChart
        title="Seu progresso"
        bars={[{ key: 'a', label: 'A', value: 10, displayValue: '10' }]}
        emptyMessage="Ainda sem dados."
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('skips the card chrome when bare is set, for embedding inside a parent card', () => {
    const { container } = render(
      <SimpleBarChart
        title="Humor × acerto"
        bars={[{ key: 'a', label: 'A', value: 10, displayValue: '10%' }]}
        emptyMessage="Ainda sem dados."
        bare
      />,
    );

    expect(container.querySelector('section')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Humor × acerto' })).toBeInTheDocument();
  });
});
