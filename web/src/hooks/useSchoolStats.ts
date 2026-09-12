import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodValue } from '../types/intercepta';
import type { EngagementEventType, EngagementStat, MoodStat } from '../types/escola';

interface MoodStatRow {
  class_id: string;
  day: string;
  mood: MoodValue;
  student_count: number;
}

interface EngagementStatRow {
  class_id: string;
  day: string;
  event_type: EngagementEventType;
  student_count: number;
}

interface UseSchoolStatsResult {
  moodStats: MoodStat[];
  engagementStats: EngagementStat[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSchoolStats(): UseSchoolStatsResult {
  const [moodStats, setMoodStats] = useState<MoodStat[]>([]);
  const [engagementStats, setEngagementStats] = useState<EngagementStat[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const [moodResult, engagementResult] = await Promise.all([
      supabase.from('school_mood_stats').select('class_id, day, mood, student_count').order('day'),
      supabase.from('school_engagement_stats').select('class_id, day, event_type, student_count').order('day'),
    ]);

    const moodRows = (moodResult.data ?? []) as MoodStatRow[];
    setMoodStats(
      moodRows.map((row) => ({
        classId: row.class_id,
        day: row.day,
        mood: row.mood,
        studentCount: row.student_count,
      })),
    );

    const engagementRows = (engagementResult.data ?? []) as EngagementStatRow[];
    setEngagementStats(
      engagementRows.map((row) => ({
        classId: row.class_id,
        day: row.day,
        eventType: row.event_type,
        studentCount: row.student_count,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { moodStats, engagementStats, loading, refetch };
}
