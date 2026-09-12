import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatTutor } from './ChatTutor';

const invokeMock = vi.fn();

vi.mock('../services/supabaseClient', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

describe('ChatTutor', () => {
  it('sends a question and shows the tutor reply', async () => {
    invokeMock.mockResolvedValue({ data: { reply: 'O que você já tentou fazer?' }, error: null });
    render(<ChatTutor activityId="activity-1" onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Sua pergunta'), { target: { value: 'Como resolvo isso?' } });
    fireEvent.click(screen.getByText('Enviar'));

    expect(screen.getByText('Como resolvo isso?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('O que você já tentou fazer?')).toBeInTheDocument());
    expect(invokeMock).toHaveBeenCalledWith('tutor-restrito', {
      body: { question: 'Como resolvo isso?', activity_id: 'activity-1' },
    });
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<ChatTutor activityId="activity-1" onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });
});
