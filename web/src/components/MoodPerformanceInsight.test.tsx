import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MoodPerformanceInsight } from './MoodPerformanceInsight';

describe('MoodPerformanceInsight', () => {
  it('renders nothing when there are fewer than 2 buckets', () => {
    const { container } = render(<MoodPerformanceInsight buckets={[{ mood: 'bem', accuracy: 80, sampleSize: 3 }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists each mood bucket with its accuracy and sample size', () => {
    render(
      <MoodPerformanceInsight
        buckets={[
          { mood: 'mal', accuracy: 50, sampleSize: 2 },
          { mood: 'muito_bem', accuracy: 90, sampleSize: 4 },
        ]}
      />,
    );

    expect(screen.getByText('Mal')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/2 respostas/)).toBeInTheDocument();
    expect(screen.getByText('Muito bem')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('highlights the mood gap when it is 15 points or more', () => {
    render(
      <MoodPerformanceInsight
        buckets={[
          { mood: 'mal', accuracy: 40, sampleSize: 2 },
          { mood: 'muito_bem', accuracy: 90, sampleSize: 4 },
        ]}
      />,
    );

    expect(screen.getByText(/50 pontos a mais/)).toBeInTheDocument();
  });

  it('does not show the gap insight when the gap is under 15 points', () => {
    render(
      <MoodPerformanceInsight
        buckets={[
          { mood: 'mal', accuracy: 70, sampleSize: 2 },
          { mood: 'muito_bem', accuracy: 75, sampleSize: 4 },
        ]}
      />,
    );

    expect(screen.queryByText(/pontos a mais/)).not.toBeInTheDocument();
  });
});
