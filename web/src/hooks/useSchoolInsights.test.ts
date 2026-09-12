import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSchoolInsights } from './useSchoolInsights';

const rpcMock = vi.fn();

vi.mock('../services/supabaseClient', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

describe('useSchoolInsights', () => {
  it('loads daily signals for the requested window', async () => {
    rpcMock.mockResolvedValue({
      data: [
        { day: '2026-09-11', metric: 'mood_avg', value: 3.8, sample_size: 12 },
        { day: '2026-09-11', metric: 'trocas_impulso', value: 7, sample_size: 7 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useSchoolInsights(14));

    await waitFor(() =>
      expect(result.current.signals).toEqual([
        { day: '2026-09-11', metric: 'mood_avg', value: 3.8, sampleSize: 12 },
        { day: '2026-09-11', metric: 'trocas_impulso', value: 7, sampleSize: 7 },
      ]),
    );
    expect(rpcMock).toHaveBeenCalledWith('school_daily_signals', { p_days: 14 });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message when the RPC is rejected (e.g. non school_admin caller)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'forbidden' } });

    const { result } = renderHook(() => useSchoolInsights());

    await waitFor(() => expect(result.current.error).toBe('forbidden'));
    expect(result.current.signals).toEqual([]);
  });
});
