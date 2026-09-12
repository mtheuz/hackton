import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { SchoolDailySignal, SchoolMetric } from '../types/school';

interface SignalRow {
  day: string;
  metric: SchoolMetric;
  value: number;
  sample_size: number;
}

interface UseSchoolInsightsResult {
  signals: SchoolDailySignal[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSchoolInsights(days = 14): UseSchoolInsightsResult {
  const [signals, setSignals] = useState<SchoolDailySignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('school_daily_signals', { p_days: days });
    if (rpcError) {
      setError(rpcError.message);
      setSignals([]);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as SignalRow[];
    setSignals(
      rows.map((row) => ({ day: row.day, metric: row.metric, value: row.value, sampleSize: row.sample_size })),
    );
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { signals, loading, error, refetch };
}
