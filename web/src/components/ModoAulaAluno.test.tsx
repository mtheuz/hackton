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
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
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
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
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
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-1',
          textContent: 'E = mc²',
          fileUrl: null,
          fileName: null,
          fileType: null,
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

  it('shows a link to the attached file when the content trigger has one', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-2',
          textContent: null,
          fileUrl: 'https://example.com/signed/apostila.pdf',
          fileName: 'apostila.pdf',
          fileType: 'application/pdf',
          accessibilityCaption: null,
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const link = screen.getByRole('link', { name: /apostila\.pdf/ });
    expect(link).toHaveAttribute('href', 'https://example.com/signed/apostila.pdf');
  });

  it('renders an inline pdf viewer for a pdf attachment, so it plays like a slide screen', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-2',
          textContent: null,
          fileUrl: 'https://example.com/signed/apostila.pdf',
          fileName: 'apostila.pdf',
          fileType: 'application/pdf',
          accessibilityCaption: null,
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const frame = screen.getByTitle('apostila.pdf');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'https://example.com/signed/apostila.pdf');
  });

  it('renders an inline image preview for an image attachment', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-3',
          textContent: null,
          fileUrl: 'https://example.com/signed/slide-1.png',
          fileName: 'slide-1.png',
          fileType: 'image/png',
          accessibilityCaption: null,
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    const img = screen.getByRole('img', { name: 'slide-1.png' });
    expect(img).toHaveAttribute('src', 'https://example.com/signed/slide-1.png');
  });

  it('opens a fullscreen view of the slide when the expand button is clicked', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-3',
          textContent: null,
          fileUrl: 'https://example.com/signed/slide-1.png',
          fileName: 'slide-1.png',
          fileType: 'image/png',
          accessibilityCaption: null,
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('img', { name: 'slide-1.png' })).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Expandir slide'));
    expect(screen.getAllByRole('img', { name: 'slide-1.png' })).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(screen.getAllByRole('img', { name: 'slide-1.png' })).toHaveLength(1);
  });

  it('keeps the plain download link for non-previewable attachments like doc', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active', topic: 'Frações' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-4',
          textContent: null,
          fileUrl: 'https://example.com/signed/apostila.doc',
          fileName: 'apostila.doc',
          fileType: 'application/msword',
          accessibilityCaption: null,
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: /apostila\.doc/ })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

it('keeps incomplete classroom codes from being submitted', () => {
  const onJoin = vi.fn();
  render(<ModoAulaAluno session={null} activity={null} contentTrigger={null} answered={false} joining={false} joinError={null} onJoin={onJoin} onSubmitAnswer={vi.fn()} onLeave={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Código da aula'), { target: { value: '12a' } });
  expect(screen.getByLabelText('Código da aula')).toHaveValue('12');
  expect(screen.getByText('Entrar na aula')).toBeDisabled();
  fireEvent.click(screen.getByText('Entrar na aula'));
  expect(onJoin).not.toHaveBeenCalled();
});
