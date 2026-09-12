import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessionLiveStats } from './useSessionLiveStats';

let mockResult: { data: unknown; error: unknown } = { data: [], error: null };

const answersBuilder: Record<string, unknown> = {
  select: vi.fn(() => answersBuilder),
  eq: vi.fn(() => answersBuilder),
  then: (resolve: (v: typeof mockResult) => void) => resolve(mockResult),
};

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => answersBuilder),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('useSessionLiveStats', () => {
  beforeEach(() => {
    mockResult = { data: [], error: null };
  });

  it('tallies answers per option for a quiz/poll activity', async () => {
    mockResult = {
      data: [
        { payload_json: { selected_index: 1 } },
        { payload_json: { selected_index: 1 } },
        { payload_json: { selected_index: 0 } },
      ],
      error: null,
    };

    const { result } = renderHook(() => useSessionLiveStats('session-1', 'activity-1', 2));

    await waitFor(() => expect(result.current).toEqual({ kind: 'options', counts: [1, 2] }));
  });

  it('lists text answers for an open_question activity', async () => {
    mockResult = {
      data: [{ payload_json: { text: 'Não entendi o exercício 3' } }, { payload_json: { text: 'Tudo certo!' } }],
      error: null,
    };

    const { result } = renderHook(() => useSessionLiveStats('session-1', 'activity-2', null));

    await waitFor(() =>
      expect(result.current).toEqual({ kind: 'texts', texts: ['Não entendi o exercício 3', 'Tudo certo!'] }),
    );
  });
});
