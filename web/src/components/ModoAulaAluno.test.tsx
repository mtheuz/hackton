import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModoAulaAluno } from './ModoAulaAluno';

describe('ModoAulaAluno', () => {
  it('joins a session by code', () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaAluno
        session={null}
        activity={null}
        contentTrigger={null}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={onJoin}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Código da aula'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Entrar na aula'));

    expect(onJoin).toHaveBeenCalledWith('1234');
  });

  it('answers a quiz activity', () => {
    const onSubmitAnswer = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        contentTrigger={null}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={onSubmitAnswer}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('4'));
    expect(onSubmitAnswer).toHaveBeenCalledWith({ selectedIndex: 1 });
  });

  it('shows the waiting message once answered', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        contentTrigger={null}
        answered={true}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Resposta enviada/)).toBeInTheDocument();
  });

  it('shows the latest content trigger with its accessibility caption', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-1',
          type: 'formula',
          content: 'E = mc²',
          accessibilityCaption: 'Energia igual massa vezes velocidade da luz ao quadrado',
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByText('E = mc²')).toBeInTheDocument();
    expect(screen.getByText('Energia igual massa vezes velocidade da luz ao quadrado')).toBeInTheDocument();
  });
});
