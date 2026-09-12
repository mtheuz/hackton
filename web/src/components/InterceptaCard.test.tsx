import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterceptaCard } from './InterceptaCard';
import type { PendingMission } from '../types/intercepta';

const mission: PendingMission = {
  missionId: 'mission-1',
  activityId: 'activity-1',
  content: {
    subject: 'matematica',
    question: 'Quanto é 7 x 8?',
    options: ['54', '56'],
    correct_index: 1,
    pf_reward: 10,
  },
};

describe('InterceptaCard', () => {
  it('answers the mission and disables the options', async () => {
    const onAnswer = vi.fn().mockResolvedValue(undefined);
    render(<InterceptaCard mission={mission} completedCount={0} onAnswer={onAnswer} onSimulateImpulse={vi.fn()} />);

    fireEvent.click(screen.getByText('56'));

    expect(onAnswer).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText('56')).toBeDisabled());
  });

  it('shows the simulate button and placar when there is no pending mission', () => {
    const onSimulateImpulse = vi.fn().mockResolvedValue(undefined);
    render(<InterceptaCard mission={null} completedCount={3} onAnswer={vi.fn()} onSimulateImpulse={onSimulateImpulse} />);

    expect(screen.getByText(/Trocas de impulso por estudo: 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Simular impulso (demo)'));
    expect(onSimulateImpulse).toHaveBeenCalled();
  });
});

it('does not announce points before saving and allows retry after failure', async () => {
  let rejectSave: (reason: Error) => void = () => {};
  const onAnswer = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSave = reject; }));
  render(<InterceptaCard mission={mission} completedCount={0} onAnswer={onAnswer} onSimulateImpulse={vi.fn()} />);
  fireEvent.click(screen.getByText('56'));
  expect(screen.queryByText(/Valeu por trocar/)).not.toBeInTheDocument();
  expect(screen.getByText('56')).toBeDisabled();
  rejectSave(new Error('offline'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar'));
  expect(screen.getByText('56')).not.toBeDisabled();
  expect(screen.queryByText(/Valeu por trocar/)).not.toBeInTheDocument();
});
