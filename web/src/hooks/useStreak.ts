import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface StreakResult {
  streak: number;
  activeToday: boolean;
  loading: boolean;
}

function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function computeStreak(dayKeys: Set<string>): { streak: number; activeToday: boolean } {
  const today = new Date();
  const todayKey = dayKey(today);
  const yesterdayKey = dayKey(new Date(today.getTime() - 86_400_000));

  const mostRecentActive = dayKeys.has(todayKey) ? todayKey : dayKeys.has(yesterdayKey) ? yesterdayKey : null;
  if (!mostRecentActive) return { streak: 0, activeToday: false };

  let streak = 0;
  const cursor = new Date(mostRecentActive + 'T00:00:00');
  while (dayKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { streak, activeToday: dayKeys.has(todayKey) };
}

export function useStreak(studentId: string): StreakResult {
  const [streak, setStreak] = useState(0);
  const [activeToday, setActiveToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setStreak(0);
      setActiveToday(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('student_events')
      .select('created_at')
      .eq('student_id', studentId)
      .eq('event_type', 'intercepta_mission');

    const dayKeys = new Set(((data ?? []) as { created_at: string }[]).map((row) => dayKey(new Date(row.created_at))));
    const result = computeStreak(dayKeys);
    setStreak(result.streak);
    setActiveToday(result.activeToday);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { streak, activeToday, loading };
}
