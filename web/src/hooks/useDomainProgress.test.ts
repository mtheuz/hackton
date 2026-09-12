import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDomainProgress } from './useDomainProgress';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const progressBuilder = chainable({
  data: [{ subject: 'matematica', level: 2, pf_accumulated: 30 }],
  error: null,
});

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => progressBuilder),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('useDomainProgress', () => {
  it('loads the progress rows for the student', async () => {
    const { result } = renderHook(() => useDomainProgress('student-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.progress).toEqual([{ subject: 'matematica', level: 2, pfAccumulated: 30 }]);
  });
});
