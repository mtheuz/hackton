import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { DomainProgress } from '../types/intercepta';

interface ProgressRow {
  subject: string;
  level: number;
  pf_accumulated: number;
}

export function useDomainProgress(studentId: string): { progress: DomainProgress[]; loading: boolean } {
  const [progress, setProgress] = useState<DomainProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setProgress([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('domain_progress')
      .select('subject, level, pf_accumulated')
      .eq('student_id', studentId)
      .order('subject');

    const rows = (data ?? []) as ProgressRow[];
    setProgress(rows.map((row) => ({ subject: row.subject, level: row.level, pfAccumulated: row.pf_accumulated })));
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
    if (!studentId) return;

    const channel = supabase
      .channel(`domain-progress-${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domain_progress', filter: `student_id=eq.${studentId}` },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, refetch]);

  return { progress, loading };
}
