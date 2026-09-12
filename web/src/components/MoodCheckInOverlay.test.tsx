import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoodCheckInOverlay } from './MoodCheckInOverlay';

describe('MoodCheckInOverlay', () => {
  it('calls onCheckin with the selected mood', () => {
    const onCheckin = vi.fn();
    render(<MoodCheckInOverlay recentMoods={[]} onCheckin={onCheckin} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Muito bem'));

    expect(onCheckin).toHaveBeenCalledWith('muito_bem');
  });

  it('calls onSkip when "Agora não" is clicked', () => {
    const onSkip = vi.fn();
    render(<MoodCheckInOverlay recentMoods={[]} onCheckin={vi.fn()} onSkip={onSkip} />);

    fireEvent.click(screen.getByText('Agora não'));

    expect(onSkip).toHaveBeenCalled();
  });

  it('is rendered as a modal dialog', () => {
    render(<MoodCheckInOverlay recentMoods={[]} onCheckin={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Check-in de humor' })).toBeInTheDocument();
  });
});
