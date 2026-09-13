import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMoodPerformance } from './useMoodPerformance';

function chainable(getResult: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (v: ReturnType<typeof getResult>) => void) => resolve(getResult()),
  };
  return builder;
}

let studentEventsCallIndex = 0;
let studentEventsResults: { data: unknown; error: unknown }[] = [];

const studentEventsBuilder = chainable(() => {
  const result = studentEventsResults[studentEventsCallIndex] ?? { data: [], error: null };
  studentEventsCallIndex += 1;
  return result;
});

const activitiesBuilder = chainable(() => ({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 1 } }],
  error: null,
}));

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'student_events':
      return studentEventsBuilder;
    case 'activities':
      return activitiesBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useMoodPerformance', () => {
  beforeEach(() => {
    studentEventsCallIndex = 0;
  });

  it('buckets quiz accuracy by the mood checked in that same day', async () => {
    studentEventsResults = [
      {
        data: [
          { created_at: '2026-09-10T08:00:00Z', payload_json: { mood: 'muito_bem' } },
          { created_at: '2026-09-11T08:00:00Z', payload_json: { mood: 'mal' } },
        ],
        error: null,
      },
      { data: [], error: null },
      {
        data: [
          {
            created_at: '2026-09-10T10:00:00Z',
            payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 },
          },
          {
            created_at: '2026-09-10T11:00:00Z',
            payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 },
          },
          {
            created_at: '2026-09-11T10:00:00Z',
            payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 },
          },
          {
            created_at: '2026-09-11T11:00:00Z',
            payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 0 },
          },
        ],
        error: null,
      },
    ];

    const { result } = renderHook(() => useMoodPerformance('student-1'));

    await waitFor(() =>
      expect(result.current.buckets).toEqual([
        { mood: 'mal', accuracy: 50, sampleSize: 2 },
        { mood: 'muito_bem', accuracy: 100, sampleSize: 2 },
      ]),
    );
    expect(result.current.isMock).toBe(false);
  });

  it('falls back to mock buckets when fewer than 2 real buckets qualify', async () => {
    studentEventsResults = [
      { data: [{ created_at: '2026-09-10T08:00:00Z', payload_json: { mood: 'bem' } }], error: null },
      { data: [], error: null },
      {
        data: [
          {
            created_at: '2026-09-10T10:00:00Z',
            payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 },
          },
        ],
        error: null,
      },
    ];

    const { result } = renderHook(() => useMoodPerformance('student-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isMock).toBe(true);
    expect(result.current.buckets.length).toBeGreaterThan(0);
  });
});
