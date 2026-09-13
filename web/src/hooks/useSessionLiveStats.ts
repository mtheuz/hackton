import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestRef = useRef(0);

  const emptyTally = useCallback((): AnswerTally => (
    optionCount !== null ? { kind: 'options', counts: new Array(optionCount).fill(0) } : { kind: 'texts', texts: [] }
  ), [optionCount]);

  const refetch = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!sessionId || !activityId) {
      setTally(emptyTally());
      return;
    }
    const { data, error } = await supabase
      .from('student_events')
      .select('payload_json')
      .eq('session_id', sessionId)
      .eq('event_type', 'activity_answer');

    const allRows = (data ?? []) as AnswerRow[];
    const hasActivityIds = allRows.some((row) => 'activity_id' in row.payload_json);
    const rows = hasActivityIds
      ? allRows.filter((row) => (row.payload_json as AnswerRow['payload_json'] & { activity_id?: string }).activity_id === activityId)
      : allRows;

    if (requestId !== requestRef.current) return;
    if (error) return;
    if (optionCount !== null) {
      const counts = new Array(optionCount).fill(0);
      for (const row of rows) {
        const index = typeof row.payload_json.selected_index === 'string' ? Number(row.payload_json.selected_index) : row.payload_json.selected_index;
        if (typeof index === 'number' && index >= 0 && index < optionCount) counts[index] += 1;
      }
      setTally({ kind: 'options', counts });
    } else {
      setTally({ kind: 'texts', texts: rows.map((row) => row.payload_json.text ?? '').filter(Boolean) });
    }
  }, [sessionId, activityId, optionCount, emptyTally]);

  useEffect(() => {
    setTally(emptyTally());
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
  }, [sessionId, activityId, optionCount, refetch, emptyTally]);

  return tally;
}
