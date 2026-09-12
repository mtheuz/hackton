import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassOverview } from './useClassOverview';

let sessionsResult: { data: unknown; error: unknown } = {
  data: [{ id: 'session-1' }, { id: 'session-2' }],
  error: null,
};

function chainable(getResult: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (v: ReturnType<typeof getResult>) => void) => resolve(getResult()),
  };
  return builder;
}

const sessionsBuilder = chainable(() => sessionsResult);
const activitiesBuilder = chainable(() => ({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 1 } }],
  error: null,
}));
const studentEventsBuilder = chainable(() => ({
  data: [
    { student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } },
    { student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 0 } },
    { student_id: 'student-2', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } },
  ],
  error: null,
}));

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
    case 'student_events':
      return studentEventsBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useClassOverview', () => {
  beforeEach(() => {
    sessionsResult = { data: [{ id: 'session-1' }, { id: 'session-2' }], error: null };
  });

  it('aggregates sessions, distinct participants, and quiz accuracy', async () => {
    const { result } = renderHook(() => useClassOverview('class-1'));

    await waitFor(() =>
      expect(result.current.overview).toEqual({
        sessionCount: 2,
        participantCount: 2,
        quizAccuracy: 67,
      }),
    );
  });

  it('reports an empty overview when the class has no sessions yet', async () => {
    sessionsResult = { data: [], error: null };
    const { result } = renderHook(() => useClassOverview('class-2'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.overview).toEqual({ sessionCount: 0, participantCount: 0, quizAccuracy: null });
  });
});
