import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodPerformanceBucket } from '../types/intercepta';

export function useClassMoodPerformance(classId: string | null): { buckets: MoodPerformanceBucket[]; loading: boolean } {
  const [buckets, setBuckets] = useState<MoodPerformanceBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!classId) {
      setBuckets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('class_mood_performance', { p_class_id: classId });
    setBuckets(error || !data ? [] : (data as { mood: MoodPerformanceBucket['mood']; accuracy: number; sample_size: number }[]).map((row) => ({
      mood: row.mood,
      accuracy: row.accuracy,
      sampleSize: row.sample_size,
    })));
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { buckets, loading };
}
