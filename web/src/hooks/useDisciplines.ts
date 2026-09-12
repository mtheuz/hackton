import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Discipline } from '../types/disciplina';

interface UseDisciplinesResult {
  disciplines: Discipline[];
  loading: boolean;
  createDiscipline: (name: string) => Promise<void>;
  renameDiscipline: (id: string, name: string) => Promise<void>;
}

export function useDisciplines(teacherId: string): UseDisciplinesResult {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!teacherId) {
      setDisciplines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('disciplines').select('id, name').eq('teacher_id', teacherId).order('name');
    setDisciplines((data ?? []) as Discipline[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createDiscipline = useCallback(
    async (name: string) => {
      const { error } = await supabase.from('disciplines').insert({ teacher_id: teacherId, name });
      if (error) throw error;
      await refetch();
    },
    [teacherId, refetch],
  );

  const renameDiscipline = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from('disciplines').update({ name }).eq('id', id);
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  return { disciplines, loading, createDiscipline, renameDiscipline };
}
