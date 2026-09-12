import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { AnswerTally } from '../types/modoAula';

interface AnswerRow {
  payload_json: { selected_index?: number; text?: string };
}

export function useSessionLiveStats(
  sessionId: string | null,
  activityId: string | null,
  optionCount: number | null,
): AnswerTally {
  const [tally, setTally] = useState<AnswerTally>(
    optionCount !== null ? { kind: 'options', counts: new Array(optionCount).fill(0) } : { kind: 'texts', texts: [] },
  );

  const refetch = useCallback(async () => {
    if (!sessionId || !activityId) return;
    const { data } = await supabase
      .from('student_events')
      .select('payload_json')
      .eq('session_id', sessionId)
      .eq('event_type', 'activity_answer')
      .eq('payload_json->>activity_id', activityId);

    const rows = (data ?? []) as AnswerRow[];

    if (optionCount !== null) {
      const counts = new Array(optionCount).fill(0);
      for (const row of rows) {
        const index = row.payload_json.selected_index;
        if (typeof index === 'number' && index >= 0 && index < optionCount) counts[index] += 1;
      }
      setTally({ kind: 'options', counts });
    } else {
      setTally({ kind: 'texts', texts: rows.map((row) => row.payload_json.text ?? '').filter(Boolean) });
    }
  }, [sessionId, activityId, optionCount]);

  useEffect(() => {
    void refetch();
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-stats-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_events', filter: `session_id=eq.${sessionId}` },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, refetch]);

  return tally;
}
