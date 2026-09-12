import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLiveSession } from './useLiveSession';

let sessionsResult: { data: unknown; error: unknown } = { data: null, error: null };

function chainable(getResult: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(getResult())),
    then: (resolve: (v: ReturnType<typeof getResult>) => void) => resolve(getResult()),
  };
  return builder;
}

const sessionsBuilder = chainable(() => sessionsResult);
const activitiesBuilder = chainable(() => ({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 } }],
  error: null,
}));
const studentEventsBuilder = chainable(() => ({ data: null, error: null }));
const contentTriggersBuilder = chainable(() => ({
  data: [{ id: 'trigger-1', type: 'formula', content: 'E=mc²', accessibility_caption: null }],
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
    case 'content_triggers':
      return contentTriggersBuilder;
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

describe('useLiveSession', () => {
  beforeEach(() => {
    sessionsResult = { data: null, error: null };
    (studentEventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('reports an error when the code does not match an active session', async () => {
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('0000');
    });

    expect(result.current.session).toBeNull();
    expect(result.current.joinError).toMatch(/não encontrado/i);
  });

  it('joins the session and loads the current activity', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });

    await waitFor(() =>
      expect(result.current.activity).toEqual({
        id: 'activity-1',
        type: 'quiz',
        content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
      }),
    );
  });

  it('submits an answer and marks the activity as answered', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });
    await waitFor(() => expect(result.current.activity).not.toBeNull());

    await act(async () => {
      await result.current.submitAnswer({ selectedIndex: 1 });
    });

    expect(studentEventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: 'session-1',
      event_type: 'activity_answer',
      payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1, text: undefined },
      pf_earned: 0,
    });
    expect(result.current.answered).toBe(true);
  });

  it('loads the most recent content trigger for the session', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });

    await waitFor(() =>
      expect(result.current.contentTrigger).toEqual({
        id: 'trigger-1',
        type: 'formula',
        content: 'E=mc²',
        accessibilityCaption: null,
      }),
    );
  });
});


it('distinguishes a connection failure from an unknown classroom code', async () => {
  sessionsResult = { data: null, error: new Error('offline') };
  const { result } = renderHook(() => useLiveSession('student-1'));
  await act(async () => { await result.current.join('1234'); });
  expect(result.current.joinError).toMatch(/conexão/i);
  expect(result.current.joining).toBe(false);
  expect(result.current.session).toBeNull();
});
