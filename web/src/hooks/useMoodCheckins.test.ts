import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMoodCheckins } from './useMoodCheckins';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const eventsBuilder = chainable({
  data: [{ id: 'evt-1', created_at: '2026-09-12T10:00:00Z', payload_json: { mood: 'bem' } }],
  error: null,
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => eventsBuilder) },
}));

describe('useMoodCheckins', () => {
  beforeEach(() => {
    (eventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('loads recent mood checkins on mount', async () => {
    const { result } = renderHook(() => useMoodCheckins('student-1'));

    await waitFor(() =>
      expect(result.current.recentMoods).toEqual([{ id: 'evt-1', mood: 'bem', createdAt: '2026-09-12T10:00:00Z' }]),
    );
  });

  it('checkin() inserts a checkin_humor event with the chosen mood', async () => {
    const { result } = renderHook(() => useMoodCheckins('student-1'));
    await waitFor(() => expect(result.current.recentMoods.length).toBe(1));

    await act(async () => {
      await result.current.checkin('muito_bem');
    });

    expect(eventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: null,
      event_type: 'checkin_humor',
      payload_json: { mood: 'muito_bem' },
    });
  });
});
