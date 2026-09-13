import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export function useSessionDoubtCount(sessionId: string | null): number {
  const [count, setCount] = useState(0);
  const refetch = useCallback(async () => {
    if (!sessionId) { setCount(0); return; }
    const { count: total, error } = await supabase.from('student_events').select('id', { count: 'exact', head: true }).eq('session_id', sessionId).eq('event_type', 'doubt_signaled');
    if (!error) setCount(total ?? 0);
  }, [sessionId]);
  useEffect(() => {
    void refetch();
    if (!sessionId) return;
    const channel = supabase.channel(`session-doubts-${sessionId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'student_events', filter: `session_id=eq.${sessionId}` }, () => void refetch()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sessionId, refetch]);
  return count;
}
