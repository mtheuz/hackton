import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLessons } from './useLessons';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: { id: 'lesson-new' }, error: null }),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const lessonsBuilder = chainable({
  data: [
    {
      id: 'lesson-1',
      class_id: 'class-1',
      name: 'Frações',
      subject: 'Frações básicas',
      allow_notes: true,
      allow_free_chatbot: false,
      focus_mode: false,
      accessibility_mode: false,
    },
  ],
  error: null,
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => lessonsBuilder) },
}));

const NO_CONFIG = { allowNotes: false, allowFreeChatbot: false, focusMode: false, accessibilityMode: false };

describe('useLessons', () => {
  it('loads lessons for the teacher', async () => {
    const { result } = renderHook(() => useLessons('teacher-1'));
    await waitFor(() =>
      expect(result.current.lessons).toEqual([
        {
          id: 'lesson-1',
          classId: 'class-1',
          name: 'Frações',
          subject: 'Frações básicas',
          config: { allowNotes: true, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
        },
      ]),
    );
  });

  it('creates a lesson for a class', async () => {
    const { result } = renderHook(() => useLessons('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createdId = '';
    await act(async () => {
      createdId = await result.current.createLesson('class-1', 'Nova aula', 'Verbos', NO_CONFIG);
    });

    expect(lessonsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ class_id: 'class-1', teacher_id: 'teacher-1', name: 'Nova aula', subject: 'Verbos' }),
    );
    expect(createdId).toBe('lesson-new');
  });

  it('updates a lesson', async () => {
    const { result } = renderHook(() => useLessons('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateLesson('lesson-1', 'Frações 2', 'Frações avançadas', {
        ...NO_CONFIG,
        focusMode: true,
      });
    });

    expect(lessonsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Frações 2', subject: 'Frações avançadas', focus_mode: true }),
    );
  });

  it('deletes a lesson', async () => {
    const { result } = renderHook(() => useLessons('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteLesson('lesson-1');
    });

    expect(lessonsBuilder.delete).toHaveBeenCalled();
  });
});
