import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassMoodInsight } from './ClassMoodInsight';

describe('ClassMoodInsight', () => {
  it('renders nothing while loading', () => {
    const { container } = render(<ClassMoodInsight buckets={[]} loading={true} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the k-anonymity placeholder when there are no buckets yet', () => {
    render(<ClassMoodInsight buckets={[]} loading={false} />);
    expect(screen.getByText(/Ainda sem dados suficientes/)).toBeInTheDocument();
  });

  it('shows each mood bucket as a bar with its accuracy, and the student count in the table twin', () => {
    render(<ClassMoodInsight buckets={[{ mood: 'bem', accuracy: 75, sampleSize: 5 }]} loading={false} />);

    expect(screen.getAllByText('75%').length).toBeGreaterThan(0);
    const table = screen.getByRole('table');
    expect(table).toHaveTextContent('Bem (5 alunos)');
  });
});
