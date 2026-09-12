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

  it('lists each mood bucket with its accuracy and student count', () => {
    render(<ClassMoodInsight buckets={[{ mood: 'bem', accuracy: 75, sampleSize: 5 }]} loading={false} />);

    expect(screen.getByText('Bem')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/5 alunos/)).toBeInTheDocument();
  });
});
