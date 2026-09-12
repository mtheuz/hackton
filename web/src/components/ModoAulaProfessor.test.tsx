import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModoAulaProfessor } from './ModoAulaProfessor';
import type { SessionConfig } from '../types/modoAula';

const NO_CONFIG: SessionConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

function openTriggerForm() {
  fireEvent.click(screen.getByText('Enviar gatilho de conteúdo'));
}

describe('ModoAulaProfessor', () => {
  it('lets the teacher start a session with the default config', () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[{ id: 'class-1', name: 'Turma Demo' }]}
        session={null}
        sessionConfig={null}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={onStartSession}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Tema da aula'), { target: { value: 'Frações' } });
    fireEvent.click(screen.getByText('Iniciar Modo Aula · Turma Demo'));
    expect(onStartSession).toHaveBeenCalledWith('class-1', NO_CONFIG, 'Frações');
  });

  it('keeps the start button disabled until a topic is filled in', () => {
    render(
      <ModoAulaProfessor
        classes={[{ id: 'class-1', name: 'Turma Demo' }]}
        session={null}
        sessionConfig={null}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByText('Iniciar Modo Aula · Turma Demo')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tema da aula'), { target: { value: '  ' } });
    expect(screen.getByText('Iniciar Modo Aula · Turma Demo')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Tema da aula'), { target: { value: 'Frações' } });
    expect(screen.getByText('Iniciar Modo Aula · Turma Demo')).not.toBeDisabled();
  });

  it('includes checked toggles in the session config', () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[{ id: 'class-1', name: 'Turma Demo' }]}
        session={null}
        sessionConfig={null}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={onStartSession}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Modo acessibilidade'));
    fireEvent.change(screen.getByLabelText('Tema da aula'), { target: { value: 'Frações' } });
    fireEvent.click(screen.getByText('Iniciar Modo Aula · Turma Demo'));

    expect(onStartSession).toHaveBeenCalledWith('class-1', { ...NO_CONFIG, accessibilityMode: true }, 'Frações');
  });

  it('launches a quiz with the filled question and options', () => {
    const onLaunchActivity = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={onLaunchActivity}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Quanto é 2+2?' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 2'), { target: { value: 'B' } });
    fireEvent.click(screen.getByText('Lançar atividade'));

    expect(onLaunchActivity).toHaveBeenCalledWith('quiz', {
      question: 'Quanto é 2+2?',
      options: ['A', 'B'],
      correct_index: 0,
    });
  });

  it('shows the live tally for the current activity', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        tally={{ kind: 'options', counts: [1, 3] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByText('1 (25%)')).toBeInTheDocument();
    expect(screen.getByText('3 (75%)')).toBeInTheDocument();
  });

  it('keeps the content trigger form collapsed by default', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Conteúdo')).not.toBeInTheDocument();
    openTriggerForm();
    expect(screen.getByLabelText('Conteúdo')).toBeInTheDocument();
  });

  it('sends a content trigger without a caption when accessibility mode is off', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    openTriggerForm();
    expect(screen.queryByLabelText('Legenda de acessibilidade')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'E = mc²' } });
    fireEvent.click(screen.getByText('Enviar gatilho'));

    expect(onSendContentTrigger).toHaveBeenCalledWith('formula', 'E = mc²', undefined);
  });

  it('sends a content trigger with a caption when accessibility mode is on', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={{ ...NO_CONFIG, accessibilityMode: true }}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    openTriggerForm();
    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'E = mc²' } });
    fireEvent.change(screen.getByLabelText('Legenda de acessibilidade'), {
      target: { value: 'Energia igual massa vezes velocidade da luz ao quadrado' },
    });
    fireEvent.click(screen.getByText('Enviar gatilho'));

    expect(onSendContentTrigger).toHaveBeenCalledWith(
      'formula',
      'E = mc²',
      'Energia igual massa vezes velocidade da luz ao quadrado',
    );
  });
});

it('blocks empty or duplicate options so the quiz answer index stays valid', () => {
  const onLaunchActivity = vi.fn();
  render(<ModoAulaProfessor classes={[]} session={{ id: 's1', code: '1234', status: 'active', topic: 'Frações' }} sessionConfig={NO_CONFIG} activity={null} tally={{ kind: 'options', counts: [] }} onStartSession={vi.fn()} onEndSession={vi.fn()} onLaunchActivity={onLaunchActivity} onSendContentTrigger={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Quanto é 2+2?' } });
  fireEvent.change(screen.getByPlaceholderText('Opção 2'), { target: { value: '4' } });
  fireEvent.click(screen.getByLabelText('Opção 2 é a correta'));
  expect(screen.getByText('Lançar atividade')).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText('Opção 1'), { target: { value: ' 4 ' } });
  expect(screen.getByText('Lançar atividade')).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText('Opção 1'), { target: { value: '3' } });
  fireEvent.click(screen.getByText('Lançar atividade'));
  expect(onLaunchActivity).toHaveBeenCalledWith('quiz', { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 });
});
