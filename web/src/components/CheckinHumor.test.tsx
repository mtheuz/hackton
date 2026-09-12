import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CheckinHumor } from './CheckinHumor';

describe('CheckinHumor', () => {
  it('calls onCheckin with the selected mood', () => {
    const onCheckin = vi.fn();
    render(<CheckinHumor recentMoods={[]} onCheckin={onCheckin} />);

    fireEvent.click(screen.getByLabelText('Muito bem'));

    expect(onCheckin).toHaveBeenCalledWith('muito_bem');
  });

  it('renders the recent mood history as icons', () => {
    render(
      <CheckinHumor
        recentMoods={[{ id: 'evt-1', mood: 'bem', createdAt: '2026-09-12T10:00:00Z' }]}
        onCheckin={vi.fn()}
      />,
    );

    const history = screen.getByLabelText('Histórico recente de humor');
    expect(within(history).getByRole('img', { name: 'Bem' })).toBeInTheDocument();
  });
});
