import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type {
  ActivityContent,
  ActivityType,
  ContentTrigger,
  ContentTriggerType,
  LiveActivity,
  LiveSession,
} from '../types/modoAula';

interface SessionRow {
  id: string;
  code: string;
  status: 'active' | 'finished';
}

interface ActivityRow {
  id: string;
  type: ActivityType;
  content_json: ActivityContent;
}

interface ContentTriggerRow {
  id: string;
  type: ContentTriggerType;
  content: string;
  accessibility_caption: string | null;
}

interface UseLiveSessionResult {
  session: LiveSession | null;
  activity: LiveActivity | null;
  contentTrigger: ContentTrigger | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  join: (code: string) => Promise<void>;
  submitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  leave: () => void;
}

export function useLiveSession(studentId: string): UseLiveSessionResult {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [contentTrigger, setContentTrigger] = useState<ContentTrigger | null>(null);
  const [answered, setAnswered] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const refetchActivity = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ActivityRow[];
    const latest = rows[0] ?? null;
    setActivity((current) => {
      const next = latest ? { id: latest.id, type: latest.type, content: latest.content_json } : null;
      if (next && current?.id !== next.id) setAnswered(false);
      return next;
    });
  }, []);

  const refetchContentTrigger = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('content_triggers')
      .select('id, type, content, accessibility_caption')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ContentTriggerRow[];
    const latest = rows[0] ?? null;
    setContentTrigger(
      latest
        ? {
            id: latest.id,
            type: latest.type,
            content: latest.content,
            accessibilityCaption: latest.accessibility_caption,
          }
        : null,
    );
  }, []);

  const refetchSessionStatus = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('id, code, status')
      .eq('id', sessionId)
      .maybeSingle<SessionRow>();
    if (data) setSession({ id: data.id, code: data.code, status: data.status });
  }, []);

  useEffect(() => {
    if (!session) return;
    void refetchActivity(session.id);
    void refetchContentTrigger(session.id);

    const channel = supabase
      .channel(`student-live-session-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `session_id=eq.${session.id}` },
        () => void refetchActivity(session.id),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'content_triggers', filter: `session_id=eq.${session.id}` },
        () => void refetchContentTrigger(session.id),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        () => void refetchSessionStatus(session.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, refetchActivity, refetchContentTrigger, refetchSessionStatus]);

  const join = useCallback(async (code: string) => {
    if (!/^\d{4}$/.test(code)) {
      setJoinError('Digite os 4 dígitos do código da aula.');
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, code, status')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle<SessionRow>();

      if (error) throw error;
      if (!data) {
        setJoinError('Código não encontrado. Confira com o professor.');
        return;
      }
      setActivity(null);
      setContentTrigger(null);
      setAnswered(false);
      setSession({ id: data.id, code: data.code, status: data.status });
    } catch {
      setJoinError('Não foi possível entrar na aula. Confira sua conexão e tente novamente.');
    } finally {
      setJoining(false);
    }
  }, []);

  const submitAnswer = useCallback(
    async (payload: { selectedIndex?: number; text?: string }) => {
      if (!session || !activity) return;
      const { error } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: session.id,
        event_type: 'activity_answer',
        payload_json: {
          activity_id: activity.id,
          type: activity.type,
          selected_index: payload.selectedIndex,
          text: payload.text,
        },
        pf_earned: 0,
      });
      if (error) throw error;
      setAnswered(true);
    },
    [session, activity, studentId],
  );

  const leave = useCallback(() => {
    setSession(null);
    setActivity(null);
    setContentTrigger(null);
    setAnswered(false);
    setJoinError(null);
  }, []);

  return { session, activity, contentTrigger, answered, joining, joinError, join, submitAnswer, leave };
}
