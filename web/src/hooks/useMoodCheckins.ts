import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodCheckin, MoodValue } from '../types/intercepta';

interface CheckinRow {
  id: string;
  created_at: string;
  payload_json: { mood: MoodValue };
}

export function useMoodCheckins(studentId: string): {
  recentMoods: MoodCheckin[];
  loading: boolean;
  checkin: (mood: MoodValue) => Promise<void>;
} {
  const [recentMoods, setRecentMoods] = useState<MoodCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setRecentMoods([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('student_events')
      .select('id, created_at, payload_json')
      .eq('student_id', studentId)
      .eq('event_type', 'checkin_humor')
      .order('created_at', { ascending: false })
      .limit(5);

    const rows = (data ?? []) as CheckinRow[];
    setRecentMoods(rows.map((row) => ({ id: row.id, mood: row.payload_json.mood, createdAt: row.created_at })));
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const checkin = useCallback(
    async (mood: MoodValue) => {
      if (!studentId) return;
      const { error } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: null,
        event_type: 'checkin_humor',
        payload_json: { mood },
      });
      if (error) throw error;
      await refetch();
    },
    [studentId, refetch],
  );

  return { recentMoods, loading, checkin };
}
