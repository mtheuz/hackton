import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassMoodPerformance } from './useClassMoodPerformance';

const rpcMock = vi.fn();

vi.mock('../services/supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

describe('useClassMoodPerformance', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('maps the RPC rows into camelCase buckets', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { mood: 'mal', accuracy: 50, sample_size: 3 },
        { mood: 'bem', accuracy: 80, sample_size: 4 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useClassMoodPerformance('class-1'));

    await waitFor(() =>
      expect(result.current.buckets).toEqual([
        { mood: 'mal', accuracy: 50, sampleSize: 3 },
        { mood: 'bem', accuracy: 80, sampleSize: 4 },
      ]),
    );
    expect(rpcMock).toHaveBeenCalledWith('class_mood_performance', { p_class_id: 'class-1' });
  });

  it('returns no buckets when the RPC errors (e.g. not the class teacher)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } });

    const { result } = renderHook(() => useClassMoodPerformance('class-2'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.buckets).toEqual([]);
  });

  it('returns no buckets and skips the RPC call when classId is null', async () => {
    const { result } = renderHook(() => useClassMoodPerformance(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.buckets).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
