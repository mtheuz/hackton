import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TurmaOverview } from './TurmaOverview';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const sessionsBuilder = chainable({ data: [{ id: 'session-1' }], error: null });
const activitiesBuilder = chainable({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 1 } }],
  error: null,
});
const studentEventsBuilder = chainable({
  data: [{ student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } }],
  error: null,
});

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
    case 'student_events':
      return studentEventsBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('TurmaOverview', () => {
  it('assigns a discipline to the class', () => {
    const onAssignDiscipline = vi.fn().mockResolvedValue(undefined);
    render(
      <TurmaOverview
        classInfo={{ id: 'class-1', name: 'Turma Demo', disciplineId: null }}
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onAssignDiscipline={onAssignDiscipline}
      />,
    );

    fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'disc-1' } });
    expect(onAssignDiscipline).toHaveBeenCalledWith('class-1', 'disc-1');
  });

  it('shows the aggregated overview once loaded', async () => {
    render(
      <TurmaOverview
        classInfo={{ id: 'class-1', name: 'Turma Demo', disciplineId: 'disc-1' }}
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onAssignDiscipline={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument());
  });
});
