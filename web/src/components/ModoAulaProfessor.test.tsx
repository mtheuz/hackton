import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ModoAulaProfessor } from './ModoAulaProfessor';
import type { SessionConfig } from '../types/modoAula';
import { expandPptxToSlideImages } from '../lib/pptxSlides';

vi.mock('../lib/pptxSlides', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/pptxSlides')>();
  return { ...actual, expandPptxToSlideImages: vi.fn() };
});

const NO_CONFIG: SessionConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

function openTriggerForm() {
  fireEvent.click(screen.getByText('Enviar material de conteúdo'));
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

    fireEvent.click(screen.getByText('Configurações da sessão'));
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
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
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
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
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

  it('flashes a notice when a new answer comes in for the current activity', () => {
    const activity = {
      id: 'activity-1',
      type: 'quiz' as const,
      content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
    };
    const { rerender } = render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={activity}
        tally={{ kind: 'options', counts: [0, 0] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.queryByText('Nova resposta!')).not.toBeInTheDocument();

    rerender(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={activity}
        tally={{ kind: 'options', counts: [0, 1] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByText('Nova resposta!')).toBeInTheDocument();
  });

  it('keeps the content trigger form collapsed by default', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Texto')).not.toBeInTheDocument();
    openTriggerForm();
    expect(screen.getByLabelText('Texto')).toBeInTheDocument();
  });

  it('sends a content trigger without a caption when accessibility mode is off', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
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

    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'E = mc²' } });
    fireEvent.click(screen.getByText('Enviar material'));

    expect(onSendContentTrigger).toHaveBeenCalledWith('E = mc²', null, undefined);
  });

  it('sends a content trigger with a caption when accessibility mode is on', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
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
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'E = mc²' } });
    fireEvent.change(screen.getByLabelText('Legenda de acessibilidade'), {
      target: { value: 'Energia igual massa vezes velocidade da luz ao quadrado' },
    });
    fireEvent.click(screen.getByText('Enviar material'));

    expect(onSendContentTrigger).toHaveBeenCalledWith(
      'E = mc²',
      null,
      'Energia igual massa vezes velocidade da luz ao quadrado',
    );
  });

  it('rejects a file with an unsupported format before it reaches state', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    openTriggerForm();
    const file = new File(['x'], 'malware.exe', { type: 'application/x-msdownload' });
    fireEvent.change(screen.getByLabelText('Arquivo (JPG, PDF, DOC ou DOCX)'), { target: { files: [file] } });

    expect(screen.getByText(/Formato não aceito/)).toBeInTheDocument();
    expect(screen.queryByText('Selecionado: malware.exe')).not.toBeInTheDocument();
  });

  it('sends a content trigger with only a file attached, no text required', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
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
    const file = new File(['conteudo'], 'apostila.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Arquivo (JPG, PDF, DOC ou DOCX)'), { target: { files: [file] } });
    expect(screen.getByText('Selecionado: apostila.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Enviar material'));

    expect(onSendContentTrigger).toHaveBeenCalledWith('', file, undefined);
  });
});

it('blocks empty or duplicate options so the quiz answer index stays valid', () => {
  const onLaunchActivity = vi.fn();
  render(<ModoAulaProfessor classes={[]} session={{ id: 's1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }} sessionConfig={NO_CONFIG} activity={null} tally={{ kind: 'options', counts: [] }} onStartSession={vi.fn()} onEndSession={vi.fn()} onLaunchActivity={onLaunchActivity} onSendContentTrigger={vi.fn()} />);
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

describe('ModoAulaProfessor pptx slide deck', () => {
  it('expands an attached pptx into individually navigable slide images', async () => {
    const slide1 = new File([new Uint8Array(1)], 'Aula-slide-1.png', { type: 'image/png' });
    const slide2 = new File([new Uint8Array(1)], 'Aula-slide-2.png', { type: 'image/png' });
    let resolveExpand!: (files: File[]) => void;
    const pending = new Promise<File[]>((resolve) => {
      resolveExpand = resolve;
    });
    vi.mocked(expandPptxToSlideImages).mockReturnValue(pending);

    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    const pptxFile = new File([new Uint8Array(4)], 'Aula.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    fireEvent.change(screen.getByLabelText('+ Anexar slides'), { target: { files: [pptxFile] } });

    await waitFor(() => expect(screen.getByText('Processando apresentação...')).toBeInTheDocument());

    await act(async () => {
      resolveExpand([slide1, slide2]);
      await pending;
    });

    await waitFor(() => expect(screen.getByText('1. Aula-slide-1.png')).toBeInTheDocument());
    expect(screen.getByText('2. Aula-slide-2.png')).toBeInTheDocument();
    expect(screen.queryByText('Processando apresentação...')).not.toBeInTheDocument();
  });
});

describe('ModoAulaProfessor slide preview', () => {
  it('shows an inline preview of the slide currently on screen, after it is pushed', async () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    const file = new File([new Uint8Array(1)], 'slide-1.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('+ Anexar slides'), { target: { files: [file] } });

    expect(screen.queryByRole('img', { name: 'slide-1.jpg' })).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText('Apresentar'));
    });

    expect(await screen.findByRole('img', { name: 'slide-1.jpg' })).toBeInTheDocument();
  });

  it('opens a fullscreen view of the slide currently on screen', async () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    const file = new File([new Uint8Array(1)], 'slide-1.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('+ Anexar slides'), { target: { files: [file] } });
    await act(async () => {
      fireEvent.click(screen.getByText('Apresentar'));
    });
    await screen.findByRole('img', { name: 'slide-1.jpg' });

    expect(screen.getAllByRole('img', { name: 'slide-1.jpg' })).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Expandir slide'));
    expect(screen.getAllByRole('img', { name: 'slide-1.jpg' })).toHaveLength(2);
    fireEvent.click(screen.getByText('Fechar'));
    expect(screen.getAllByRole('img', { name: 'slide-1.jpg' })).toHaveLength(1);
  });
});

describe('ModoAulaProfessor mood snapshot', () => {
  it('shows the class mood chart for the active session', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        moodBuckets={[{ mood: 'bem', count: 5 }]}
        moodLoading={false}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Humor da turma hoje' })).toBeInTheDocument();
  });
});

describe('ModoAulaProfessor with pending lesson slides', () => {
  const pendingSlides = [
    {
      id: 'slide-2',
      position: 1,
      type: 'open_question' as const,
      content: { question: 'O que você aprendeu?' },
      textContent: null,
      filePath: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
      accessibilityCaption: null,
    },
  ];

  it('shows a button to advance to the next lesson slide', () => {
    const onLaunchSlide = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        pendingSlides={pendingSlides}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onLaunchSlide={onLaunchSlide}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByText('Próximo slide da aula (1 restante)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Avançar'));
    expect(onLaunchSlide).toHaveBeenCalledWith(pendingSlides[0]);
  });

  it('hides the advance button when there are no pending slides', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', classId: 'class-1', code: '1234', status: 'active', topic: 'Frações' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        pendingSlides={[]}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onLaunchSlide={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.queryByText('Avançar')).not.toBeInTheDocument();
  });
});
