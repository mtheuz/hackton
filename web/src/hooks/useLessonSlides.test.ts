import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLessonSlides } from './useLessonSlides';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

let slidesResult: { data: unknown; error: unknown } = {
  data: [
    {
      id: 'slide-1',
      position: 0,
      slide_type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
      text_content: null,
      file_path: null,
      file_name: null,
      file_type: null,
      accessibility_caption: null,
    },
  ],
  error: null,
};
const slidesBuilder = chainable(slidesResult);
// keep the mock's `then` reading the live `slidesResult` reference across tests
slidesBuilder.then = (resolve: (v: typeof slidesResult) => void) => resolve(slidesResult);

const storageUploadMock = vi.fn().mockResolvedValue({ data: { path: 'lessons/lesson-1/file.pdf' }, error: null });
const storageMock = { from: vi.fn(() => ({ upload: storageUploadMock, createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.pdf' }, error: null }) })) };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => slidesBuilder),
    get storage() {
      return storageMock;
    },
  },
}));

describe('useLessonSlides', () => {
  it('loads slides for the lesson in position order', async () => {
    const { result } = renderHook(() => useLessonSlides('lesson-1'));
    await waitFor(() =>
      expect(result.current.slides).toEqual([
        {
          id: 'slide-1',
          position: 0,
          type: 'quiz',
          content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
          textContent: null,
          filePath: null,
          fileUrl: null,
          fileName: null,
          fileType: null,
          accessibilityCaption: null,
        },
      ]),
    );
  });

  it('adds a quiz slide', async () => {
    const { result } = renderHook(() => useLessonSlides('lesson-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addActivitySlide('quiz', { question: 'Novo?', options: ['X', 'Y'], correct_index: 1 });
    });

    expect(slidesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: 'lesson-1',
        slide_type: 'quiz',
        content_json: { question: 'Novo?', options: ['X', 'Y'], correct_index: 1 },
      }),
    );
  });

  it('uploads a file and adds a material slide', async () => {
    const { result } = renderHook(() => useLessonSlides('lesson-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const file = new File(['conteudo'], 'apostila.pdf', { type: 'application/pdf' });

    await act(async () => {
      await result.current.addMaterialSlide({ textContent: 'Leia isso', file });
    });

    expect(storageUploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^lessons\/lesson-1\/.+\.pdf$/),
      file,
      { contentType: 'application/pdf' },
    );
    expect(slidesBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: 'lesson-1',
        slide_type: 'material',
        text_content: 'Leia isso',
        file_name: 'apostila.pdf',
        file_type: 'application/pdf',
      }),
    );
  });

  it('removes a slide', async () => {
    const { result } = renderHook(() => useLessonSlides('lesson-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeSlide('slide-1');
    });

    expect(slidesBuilder.delete).toHaveBeenCalled();
  });

  it('swaps positions when moving a slide down', async () => {
    slidesResult = {
      data: [
        {
          id: 'slide-1',
          position: 0,
          slide_type: 'quiz',
          content_json: { question: 'Q1?', options: ['A', 'B'], correct_index: 0 },
          text_content: null,
          file_path: null,
          file_name: null,
          file_type: null,
          accessibility_caption: null,
        },
        {
          id: 'slide-2',
          position: 1,
          slide_type: 'open_question',
          content_json: { question: 'Q2?' },
          text_content: null,
          file_path: null,
          file_name: null,
          file_type: null,
          accessibility_caption: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useLessonSlides('lesson-1'));
    await waitFor(() => expect(result.current.slides.length).toBe(2));

    await act(async () => {
      await result.current.moveSlide('slide-1', 'down');
    });

    expect(slidesBuilder.update).toHaveBeenCalledWith({ position: 1 });
    expect(slidesBuilder.update).toHaveBeenCalledWith({ position: 0 });
  });
});
