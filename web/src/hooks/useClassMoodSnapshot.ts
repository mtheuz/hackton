import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodSnapshotBucket } from '../types/intercepta';
import { MOCK_CLASS_MOOD_BUCKETS } from '../lib/mockMoodData';

export function useClassMoodSnapshot(
  classId: string | null,
): { buckets: MoodSnapshotBucket[]; loading: boolean; isMock: boolean } {
  const [buckets, setBuckets] = useState<MoodSnapshotBucket[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!classId) {
      setBuckets([]);
      setIsMock(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('class_mood_snapshot', { p_class_id: classId });
    if (error || !data) {
      setBuckets([]);
      setIsMock(false);
    } else if (data.length === 0) {
      // Turma sem volume real suficiente hoje (k-anonimato mínimo de 3) — usa exemplo pra demo.
      setBuckets(MOCK_CLASS_MOOD_BUCKETS);
      setIsMock(true);
    } else {
      setBuckets((data as { mood: MoodSnapshotBucket['mood']; count: number }[]).map((row) => ({
        mood: row.mood,
        count: row.count,
      })));
      setIsMock(false);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { buckets, loading, isMock };
}
