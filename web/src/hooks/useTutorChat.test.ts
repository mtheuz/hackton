import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTutorChat } from './useTutorChat';

const invokeMock = vi.fn();

vi.mock('../services/supabaseClient', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

describe('useTutorChat', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('adds the student question immediately and appends the tutor reply', async () => {
    invokeMock.mockResolvedValue({ data: { reply: 'O que você já tentou?' }, error: null });

    const { result } = renderHook(() => useTutorChat('activity-1'));

    await act(async () => {
      await result.current.ask('Como resolvo essa equação?');
    });

    expect(invokeMock).toHaveBeenCalledWith('tutor-restrito', {
      body: { question: 'Como resolvo essa equação?', activity_id: 'activity-1' },
    });
    expect(result.current.turns).toEqual([
      { id: expect.any(String), role: 'student', content: 'Como resolvo essa equação?' },
      { id: expect.any(String), role: 'tutor', content: 'O que você já tentou?' },
    ]);
  });

  it('shows a friendly message when the function returns an error', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { json: () => Promise.resolve({ error: 'tutor indisponível no momento', code: 503 }) } },
    });

    const { result } = renderHook(() => useTutorChat(null));

    await act(async () => {
      await result.current.ask('Oi');
    });

    expect(result.current.turns[1]).toEqual({
      id: expect.any(String),
      role: 'tutor',
      content: 'tutor indisponível no momento',
    });
  });
});
