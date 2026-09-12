import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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


it('keeps the check-in open and allows retry when saving fails', async () => {
  const onSkip = vi.fn();
  const onCheckin = vi.fn().mockRejectedValue(new Error('offline'));
  render(<MoodCheckInOverlay recentMoods={[]} onCheckin={onCheckin} onSkip={onSkip} />);
  fireEvent.click(screen.getByRole('button', { name: 'Bem' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar'));
  expect(onSkip).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Bem' })).not.toBeDisabled();
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
