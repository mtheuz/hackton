import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useInterceptaMission } from './useInterceptaMission';

const missionRow = {
  id: 'mission-1',
  activity_id: 'activity-1',
  completed_at: null,
  activities: {
    content_json: {
      subject: 'matematica',
      question: 'Quanto é 7 x 8?',
      options: ['54', '56', '58', '64'],
      correct_index: 1,
      pf_reward: 10,
    },
  },
};

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const interceptaBuilder = chainable({ data: [missionRow], error: null });
const studentEventsBuilder = chainable({ data: null, error: null });
const domainProgressBuilder = chainable({ data: null, error: null });
const activitiesBuilder = chainable({ data: [{ id: 'activity-2' }], error: null });

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'intercepta_missions':
      return interceptaBuilder;
    case 'student_events':
      return studentEventsBuilder;
    case 'domain_progress':
      return domainProgressBuilder;
    case 'activities':
      return activitiesBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('useInterceptaMission', () => {
  beforeEach(() => {
    fromMock.mockClear();
    (interceptaBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
    (interceptaBuilder.update as ReturnType<typeof vi.fn>).mockClear();
    (studentEventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
    (domainProgressBuilder.upsert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('loads the pending mission for the student', async () => {
    const { result } = renderHook(() => useInterceptaMission('student-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mission).toEqual({
      missionId: 'mission-1',
      activityId: 'activity-1',
      content: missionRow.activities.content_json,
    });
    expect(result.current.completedCount).toBe(0);
  });

  it('records the answer, closes the mission and grants PF', async () => {
    const { result } = renderHook(() => useInterceptaMission('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeMission(1);
    });

    expect(studentEventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: null,
      event_type: 'intercepta_mission',
      payload_json: { activity_id: 'activity-1', selected_index: 1, correct: true },
      pf_earned: 10,
    });
    expect(interceptaBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: expect.any(String) }),
    );
    expect(domainProgressBuilder.upsert).toHaveBeenCalledWith({
      student_id: 'student-1',
      subject: 'matematica',
      level: 1,
      pf_accumulated: 10,
    });
  });
});
