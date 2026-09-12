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
});
