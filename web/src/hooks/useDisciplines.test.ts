import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDisciplines } from './useDisciplines';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const disciplinesBuilder = chainable({ data: [{ id: 'disc-1', name: 'Matemática' }], error: null });

const fromMock = vi.fn((_table: string) => disciplinesBuilder);

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useDisciplines', () => {
  it("loads the teacher's disciplines", async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.disciplines).toEqual([{ id: 'disc-1', name: 'Matemática' }]);
  });

  it('creates a new discipline', async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createDiscipline('Português');
    });

    expect(disciplinesBuilder.insert).toHaveBeenCalledWith({ teacher_id: 'teacher-1', name: 'Português' });
  });

  it('renames an existing discipline', async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.renameDiscipline('disc-1', 'Matemática Básica');
    });

    expect(disciplinesBuilder.update).toHaveBeenCalledWith({ name: 'Matemática Básica' });
  });
});
