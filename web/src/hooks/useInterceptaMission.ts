import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MissionActivityContent, PendingMission } from '../types/intercepta';

interface MissionRow {
  id: string;
  activity_id: string;
  completed_at: string | null;
  activities: { content_json: MissionActivityContent } | null;
}

interface UseInterceptaMissionResult {
  mission: PendingMission | null;
  completedCount: number;
  loading: boolean;
  completeMission: (selectedIndex: number) => Promise<void>;
  simulateImpulse: () => Promise<void>;
}

export function useInterceptaMission(studentId: string): UseInterceptaMissionResult {
  const [mission, setMission] = useState<PendingMission | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setMission(null);
      setCompletedCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('intercepta_missions')
      .select('id, activity_id, completed_at, activities(content_json)')
      .eq('student_id', studentId)
      .order('trigger_time', { ascending: true });

    const rows = (data ?? []) as unknown as MissionRow[];
    const pending = rows.find((row) => !row.completed_at) ?? null;

    setMission(
      pending && pending.activities
        ? { missionId: pending.id, activityId: pending.activity_id, content: pending.activities.content_json }
        : null,
    );
    setCompletedCount(rows.filter((row) => row.completed_at).length);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
    if (!studentId) return;

    const channel = supabase
      .channel(`intercepta-missions-${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intercepta_missions', filter: `student_id=eq.${studentId}` },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, refetch]);

  const triggerNextMission = useCallback(
    async (excludeActivityId?: string) => {
      if (!studentId) return;
      const { data } = await supabase.from('activities').select('id').eq('type', 'quiz');
      let activities = (data ?? []) as { id: string }[];
      if (excludeActivityId && activities.length > 1) {
        activities = activities.filter((a) => a.id !== excludeActivityId);
      }
      if (activities.length === 0) return;

      const chosen = activities[Math.floor(Math.random() * activities.length)];
      const { error } = await supabase.from('intercepta_missions').insert({
        student_id: studentId,
        activity_id: chosen.id,
        trigger_time: new Date().toISOString(),
      });
      if (error) throw error;
    },
    [studentId],
  );

  const completeMission = useCallback(
    async (selectedIndex: number) => {
      if (!mission) return;
      const correct = selectedIndex === mission.content.correct_index;
      const pfEarned = mission.content.pf_reward;

      const { error: eventError } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: null,
        event_type: 'intercepta_mission',
        payload_json: { activity_id: mission.activityId, selected_index: selectedIndex, correct },
        pf_earned: pfEarned,
      });
      if (eventError) throw eventError;

      const { error: missionError } = await supabase
        .from('intercepta_missions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', mission.missionId)
        .eq('student_id', studentId);
      if (missionError) throw missionError;

      const { data: existing } = await supabase
        .from('domain_progress')
        .select('level, pf_accumulated')
        .eq('student_id', studentId)
        .eq('subject', mission.content.subject)
        .maybeSingle<{ level: number; pf_accumulated: number }>();

      const { error: progressError } = await supabase.from('domain_progress').upsert({
        student_id: studentId,
        subject: mission.content.subject,
        level: existing?.level ?? 1,
        pf_accumulated: (existing?.pf_accumulated ?? 0) + pfEarned,
      });
      if (progressError) throw progressError;

      await triggerNextMission(mission.activityId);
      await refetch();
    },
    [mission, studentId, refetch, triggerNextMission],
  );

  const simulateImpulse = useCallback(async () => {
    await triggerNextMission();
    await refetch();
  }, [triggerNextMission, refetch]);

  return { mission, completedCount, loading, completeMission, simulateImpulse };
}
