import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassMoodSnapshot } from './useClassMoodSnapshot';

const rpcMock = vi.fn();

vi.mock('../services/supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

describe('useClassMoodSnapshot', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('maps the RPC rows into camelCase buckets', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { mood: 'bem', count: 4 },
        { mood: 'neutro', count: 3 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useClassMoodSnapshot('class-1'));

    await waitFor(() =>
      expect(result.current.buckets).toEqual([
        { mood: 'bem', count: 4 },
        { mood: 'neutro', count: 3 },
      ]),
    );
    expect(rpcMock).toHaveBeenCalledWith('class_mood_snapshot', { p_class_id: 'class-1' });
    expect(result.current.isMock).toBe(false);
  });

  it('returns no buckets when the RPC errors (e.g. not the class teacher)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } });

    const { result } = renderHook(() => useClassMoodSnapshot('class-2'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.buckets).toEqual([]);
    expect(result.current.isMock).toBe(false);
  });

  it('returns no buckets and skips the RPC call when classId is null', async () => {
    const { result } = renderHook(() => useClassMoodSnapshot(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.buckets).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('falls back to mock buckets when the RPC succeeds with no rows (insufficient real data)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useClassMoodSnapshot('class-3'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isMock).toBe(true);
    expect(result.current.buckets.length).toBeGreaterThan(0);
  });
});
