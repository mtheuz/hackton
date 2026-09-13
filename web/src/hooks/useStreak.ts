import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export interface DayStreakItem {
  dayKey: string;
  dayLabel: string;
  active: boolean;
  isToday: boolean;
}

interface StreakResult {
  streak: number;
  activeToday: boolean;
  recentDays: DayStreakItem[];
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

function computeRecentDays(dayKeys: Set<string>): DayStreakItem[] {
  const days: DayStreakItem[] = [];
  const today = new Date();
  const todayKey = dayKey(today);
  const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const dKey = dayKey(d);
    days.push({
      dayKey: dKey,
      dayLabel: dayNames[d.getDay()],
      active: dayKeys.has(dKey),
      isToday: dKey === todayKey,
    });
  }
  return days;
}

export function useStreak(studentId: string): StreakResult {
  const [streak, setStreak] = useState(0);
  const [activeToday, setActiveToday] = useState(false);
  const [recentDays, setRecentDays] = useState<DayStreakItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setStreak(0);
      setActiveToday(false);
      setRecentDays([]);
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
    setRecentDays(computeRecentDays(dayKeys));
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { streak, activeToday, recentDays, loading };
}
