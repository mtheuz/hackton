import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LessonEditor } from './LessonEditor';
import type { Lesson } from '../types/lesson';

const addActivitySlideMock = vi.fn().mockResolvedValue(undefined);
const addMaterialSlideMock = vi.fn().mockResolvedValue(undefined);
const removeSlideMock = vi.fn().mockResolvedValue(undefined);
const moveSlideMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../hooks/useLessonSlides', () => ({
  useLessonSlides: () => ({
    slides: [
      {
        id: 'slide-1',
        position: 0,
        type: 'quiz',
        content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        textContent: null,
        filePath: null,
        fileUrl: null,
        fileName: null,
        fileType: null,
        accessibilityCaption: null,
      },
    ],
    loading: false,
    addActivitySlide: addActivitySlideMock,
    addMaterialSlide: addMaterialSlideMock,
    removeSlide: removeSlideMock,
    moveSlide: moveSlideMock,
  }),
}));

const lesson: Lesson = {
  id: 'lesson-1',
  classId: 'class-1',
  name: 'Frações',
  subject: 'Frações básicas',
  config: { allowNotes: false, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
};

describe('LessonEditor', () => {
  it('saves the lesson name, subject and config', () => {
    const onUpdateLesson = vi.fn().mockResolvedValue(undefined);
    render(<LessonEditor lesson={lesson} onUpdateLesson={onUpdateLesson} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Frações 2' } });
    fireEvent.click(screen.getByLabelText('Modo foco'));
    fireEvent.click(screen.getByText('Salvar aula'));

    expect(onUpdateLesson).toHaveBeenCalledWith('Frações 2', 'Frações básicas', {
      allowNotes: false,
      allowFreeChatbot: false,
      focusMode: true,
      accessibilityMode: false,
    });
  });

  it('lists existing slides', () => {
    render(<LessonEditor lesson={lesson} onUpdateLesson={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Quanto é 2\+2\?/)).toBeInTheDocument();
  });

  it('adds a new quiz slide', () => {
    render(<LessonEditor lesson={lesson} onUpdateLesson={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Nova pergunta?' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 2'), { target: { value: 'B' } });
    fireEvent.click(screen.getByText('Adicionar slide'));

    expect(addActivitySlideMock).toHaveBeenCalledWith('quiz', {
      question: 'Nova pergunta?',
      options: ['A', 'B'],
      correct_index: 0,
    });
  });

  it('adds a material slide with just text', () => {
    render(<LessonEditor lesson={lesson} onUpdateLesson={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Novo slide'), { target: { value: 'material' } });
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Leia o capítulo 3' } });
    fireEvent.click(screen.getByText('Adicionar slide'));

    expect(addMaterialSlideMock).toHaveBeenCalledWith({ textContent: 'Leia o capítulo 3', file: null });
  });
});
