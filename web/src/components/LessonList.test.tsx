import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LessonList } from './LessonList';
import type { Lesson } from '../types/lesson';

vi.mock('../hooks/useLessonSlides', () => ({
  useLessonSlides: () => ({
    slides: [],
    loading: false,
    addActivitySlide: vi.fn(),
    addMaterialSlide: vi.fn(),
    removeSlide: vi.fn(),
    moveSlide: vi.fn(),
  }),
}));

const classes = [
  { id: 'class-1', name: 'Turma A' },
  { id: 'class-2', name: 'Turma B' },
];

const lessons: Lesson[] = [
  {
    id: 'lesson-1',
    classId: 'class-1',
    name: 'Frações',
    subject: 'Frações básicas',
    config: { allowNotes: false, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
  },
  {
    id: 'lesson-2',
    classId: 'class-2',
    name: 'Verbos',
    subject: 'Conjugação',
    config: { allowNotes: false, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
  },
];

describe('LessonList', () => {
  it('shows only lessons for the selected class', () => {
    render(
      <LessonList
        classes={classes}
        lessons={lessons}
        loading={false}
        onCreateLesson={vi.fn()}
        onUpdateLesson={vi.fn()}
        onDeleteLesson={vi.fn()}
        onStartLesson={vi.fn()}
      />,
    );

    expect(screen.getByText('Frações')).toBeInTheDocument();
    expect(screen.queryByText('Verbos')).not.toBeInTheDocument();
  });

  it('creates a lesson for the selected class and opens the editor once it appears in the list', async () => {
    const newLesson: Lesson = {
      id: 'lesson-3',
      classId: 'class-1',
      name: 'Nova aula',
      subject: '',
      config: { allowNotes: false, allowFreeChatbot: false, focusMode: false, accessibilityMode: false },
    };
    const onCreateLesson = vi.fn().mockResolvedValue('lesson-3');
    const { rerender } = render(
      <LessonList
        classes={classes}
        lessons={lessons}
        loading={false}
        onCreateLesson={onCreateLesson}
        onUpdateLesson={vi.fn()}
        onDeleteLesson={vi.fn()}
        onStartLesson={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Nova aula'));

    await waitFor(() =>
      expect(onCreateLesson).toHaveBeenCalledWith('class-1', 'Nova aula', '', {
        allowNotes: false,
        allowFreeChatbot: false,
        focusMode: false,
        accessibilityMode: false,
      }),
    );

    // Mirrors what happens for real: createLesson's own refetch() updates the
    // parent's `lessons` state, which flows back down as a fresh prop here.
    rerender(
      <LessonList
        classes={classes}
        lessons={[...lessons, newLesson]}
        loading={false}
        onCreateLesson={onCreateLesson}
        onUpdateLesson={vi.fn()}
        onDeleteLesson={vi.fn()}
        onStartLesson={vi.fn()}
      />,
    );

    expect(screen.getByText('Editar aula')).toBeInTheDocument();
  });

  it('starts Modo Aula from a lesson', () => {
    const onStartLesson = vi.fn().mockResolvedValue(undefined);
    render(
      <LessonList
        classes={classes}
        lessons={lessons}
        loading={false}
        onCreateLesson={vi.fn()}
        onUpdateLesson={vi.fn()}
        onDeleteLesson={vi.fn()}
        onStartLesson={onStartLesson}
      />,
    );

    fireEvent.click(screen.getByText('Iniciar Modo Aula'));
    expect(onStartLesson).toHaveBeenCalledWith(lessons[0]);
  });
});
