import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeacherSession } from './useTeacherSession';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const classesBuilder = chainable({
  data: [{ id: 'class-1', name: 'Turma Demo', discipline_id: null }],
  error: null,
});
const sessionsBuilder = chainable({
  data: [
    {
      id: 'session-1',
      code: '1234',
      status: 'active',
      topic: 'Frações',
      allow_notes: false,
      allow_free_chatbot: false,
      focus_mode: false,
      quiz_at_end: false,
      accessibility_mode: true,
    },
  ],
  error: null,
});
const activitiesBuilder = chainable({
  data: [
    {
      id: 'activity-1',
      type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    },
  ],
  error: null,
});
const contentTriggersBuilder = chainable({ data: null, error: null });

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'classes':
      return classesBuilder;
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
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

const NO_CONFIG = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

describe('useTeacherSession', () => {
  it('starts a session with a 4-digit code and the chosen config', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startSession('class-1', { ...NO_CONFIG, accessibilityMode: true }, 'Frações');
    });

    expect(sessionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        class_id: 'class-1',
        teacher_id: 'teacher-1',
        status: 'active',
        topic: 'Frações',
        allow_notes: false,
        allow_free_chatbot: false,
        focus_mode: false,
        quiz_at_end: false,
        accessibility_mode: true,
      }),
    );
    const insertedPayload = (sessionsBuilder.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as { code: string };
    expect(insertedPayload.code).toMatch(/^\d{4}$/);
  });

  it('launches an activity and exposes it as the current one', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.launchActivity('quiz', { question: 'Q?', options: ['A', 'B'], correct_index: 0 });
    });

    expect(activitiesBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    });
    expect(result.current.activity).toEqual({
      id: 'activity-1',
      type: 'quiz',
      content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    });
  });

  it('exposes the session config loaded from the active session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.sessionConfig).toEqual({ ...NO_CONFIG, accessibilityMode: true }));
  });

  it('sends a content trigger for the current session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.sendContentTrigger(
        'formula',
        'E = mc²',
        'Energia igual massa vezes velocidade da luz ao quadrado',
      );
    });

    expect(contentTriggersBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      type: 'formula',
      content: 'E = mc²',
      accessibility_caption: 'Energia igual massa vezes velocidade da luz ao quadrado',
    });
  });

  it('loads classes with their assigned discipline', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() =>
      expect(result.current.classes).toEqual([{ id: 'class-1', name: 'Turma Demo', disciplineId: null }]),
    );
  });

  it('assigns a discipline to a class', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.classes.length).toBe(1));

    await act(async () => {
      await result.current.assignDiscipline('class-1', 'disc-1');
    });

    expect(classesBuilder.update).toHaveBeenCalledWith({ discipline_id: 'disc-1' });
  });
});
