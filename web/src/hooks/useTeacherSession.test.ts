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
    single: vi.fn().mockResolvedValue({ data: { id: 'session-new' }, error: null }),
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
      class_id: 'class-1',
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
const storageUploadMock = vi.fn().mockResolvedValue({ data: { path: 'session-1/file.pdf' }, error: null });
const storageMock = { from: vi.fn(() => ({ upload: storageUploadMock })) };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
    get storage() {
      return storageMock;
    },
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

  it('exposes the class id of the active session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.classId).toBe('class-1'));
  });

  it('sends a text-only content trigger for the current session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.sendContentTrigger(
        'E = mc²',
        null,
        'Energia igual massa vezes velocidade da luz ao quadrado',
      );
    });

    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(contentTriggersBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      text_content: 'E = mc²',
      file_path: null,
      file_name: null,
      file_type: null,
      accessibility_caption: 'Energia igual massa vezes velocidade da luz ao quadrado',
    });
  });

  it('uploads and links a file when sending a content trigger', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    const file = new File(['conteudo'], 'apostila.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.sendContentTrigger('', file);
    });

    expect(storageUploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^session-1\/.+\.pdf$/),
      file,
      { contentType: 'application/pdf' },
    );
    expect(contentTriggersBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-1',
        text_content: null,
        file_name: 'apostila.pdf',
        file_type: 'application/pdf',
      }),
    );
  });

  it('starts a session from a lesson and launches its first slide as an activity', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const lesson = {
      id: 'lesson-1',
      classId: 'class-1',
      name: 'Frações',
      subject: 'Frações básicas',
      config: { allowNotes: true, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
    };
    const firstSlide = {
      id: 'slide-1',
      position: 0,
      type: 'quiz' as const,
      content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
      textContent: null,
      filePath: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
      accessibilityCaption: null,
    };

    await act(async () => {
      await result.current.startSessionFromLesson(lesson, firstSlide);
    });

    expect(sessionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        class_id: 'class-1',
        teacher_id: 'teacher-1',
        topic: 'Frações básicas',
        allow_notes: true,
      }),
    );
    expect(activitiesBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-new',
      type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    });
  });

  it('launches a material slide as a content trigger for the current session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.launchSlide({
        id: 'slide-2',
        position: 1,
        type: 'material',
        content: null,
        textContent: 'Leia o capítulo 3',
        filePath: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        accessibilityCaption: null,
      });
    });

    expect(contentTriggersBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      text_content: 'Leia o capítulo 3',
      file_path: null,
      file_name: null,
      file_type: null,
      accessibility_caption: null,
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
