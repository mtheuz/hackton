import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassMoodToday } from './ClassMoodToday';

describe('ClassMoodToday', () => {
  it('renders nothing while loading', () => {
    const { container } = render(<ClassMoodToday buckets={[]} loading={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the k-anonymity placeholder when there are no buckets yet', () => {
    render(<ClassMoodToday buckets={[]} loading={false} />);
    expect(screen.getByText(/Ainda sem dados suficientes/)).toBeInTheDocument();
  });

  it('shows each mood bucket as a bar with its count, and the count in the table twin', () => {
    render(<ClassMoodToday buckets={[{ mood: 'bem', count: 5 }]} loading={false} />);

    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('Bem (5 alunos)');
  });
});
