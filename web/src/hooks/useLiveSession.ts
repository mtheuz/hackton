import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type {
  ActivityContent,
  ActivityType,
  ContentTrigger,
  LiveActivity,
  LiveSession,
} from '../types/modoAula';

const CONTENT_TRIGGER_BUCKET = 'content-triggers';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SESSION_CODE_STORAGE_PREFIX = 'fokido:live-session-code:';

function sessionCodeStorageKey(studentId: string): string {
  return `${SESSION_CODE_STORAGE_PREFIX}${studentId}`;
}

function readStoredSessionCode(studentId: string): string | null {
  try {
    return localStorage.getItem(sessionCodeStorageKey(studentId));
  } catch {
    return null;
  }
}

function writeStoredSessionCode(studentId: string, code: string | null): void {
  try {
    if (code) localStorage.setItem(sessionCodeStorageKey(studentId), code);
    else localStorage.removeItem(sessionCodeStorageKey(studentId));
  } catch {
    // localStorage indisponível (modo privado, etc) — só perde a reconexão automática.
  }
}

interface SessionRow {
  id: string;
  code: string;
  status: 'active' | 'finished';
  topic: string;
  teacher_id: string;
  created_at: string;
  allow_notes: boolean;
  allow_free_chatbot: boolean;
  focus_mode: boolean;
  quiz_at_end: boolean;
  accessibility_mode: boolean;
  allow_transcription: boolean;
}

interface ActivityRow {
  id: string;
  type: ActivityType;
  content_json: ActivityContent;
}

interface ContentTriggerRow {
  id: string;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  accessibility_caption: string | null;
}

interface UseLiveSessionResult {
  session: LiveSession | null;
  activity: LiveActivity | null;
  contentTrigger: ContentTrigger | null;
  sessionConfig: import('../types/modoAula').SessionConfig | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  join: (code: string) => Promise<void>;
  submitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  leave: () => void;
  signalDoubt: () => Promise<void>;
}

export function useLiveSession(studentId: string): UseLiveSessionResult {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [contentTrigger, setContentTrigger] = useState<ContentTrigger | null>(null);
  const [sessionConfig, setSessionConfig] = useState<import('../types/modoAula').SessionConfig | null>(null);
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
      .select('id, text_content, file_path, file_name, file_type, accessibility_caption')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ContentTriggerRow[];
    const latest = rows[0] ?? null;
    if (!latest) {
      setContentTrigger(null);
      return;
    }

    let fileUrl: string | null = null;
    if (latest.file_path) {
      const { data: signed } = await supabase.storage
        .from(CONTENT_TRIGGER_BUCKET)
        .createSignedUrl(latest.file_path, SIGNED_URL_TTL_SECONDS);
      fileUrl = signed?.signedUrl ?? null;
    }

    setContentTrigger({
      id: latest.id,
      textContent: latest.text_content,
      fileUrl,
      fileName: latest.file_name,
      fileType: latest.file_type,
      accessibilityCaption: latest.accessibility_caption,
    });
  }, []);

  const refetchSessionStatus = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('id, code, status, topic, teacher_id, created_at, allow_notes, allow_free_chatbot, focus_mode, quiz_at_end, accessibility_mode, allow_transcription')
      .eq('id', sessionId)
      .maybeSingle<SessionRow>();
    if (data) { const { data: teacher } = data.teacher_id ? await supabase.from('users').select('name').eq('id', data.teacher_id).maybeSingle<{ name: string }>() : { data: null }; setSession({ id: data.id, code: data.code, status: data.status, topic: data.topic, teacherName: teacher?.name, createdAt: data.created_at }); setSessionConfig({ allowNotes: data.allow_notes, allowFreeChatbot: data.allow_free_chatbot, focusMode: data.focus_mode, quizAtEnd: data.quiz_at_end, accessibilityMode: data.accessibility_mode, allowTranscription: data.allow_transcription }); }
  }, []);

  useEffect(() => {
    if (session?.status === 'finished') writeStoredSessionCode(studentId, null);
  }, [session?.status, studentId]);

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

  const fetchActiveSessionByCode = useCallback(async (code: string) => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, code, status, topic, teacher_id, created_at, allow_notes, allow_free_chatbot, focus_mode, quiz_at_end, accessibility_mode, allow_transcription')
      .eq('code', code)
      .eq('status', 'active')
      .maybeSingle<SessionRow>();
    if (error) throw error;
    return data;
  }, []);

  const applySessionRow = useCallback(async (data: SessionRow) => {
    setActivity(null);
    setContentTrigger(null);
    setAnswered(false);
    setSessionConfig({ allowNotes: data.allow_notes, allowFreeChatbot: data.allow_free_chatbot, focusMode: data.focus_mode, quizAtEnd: data.quiz_at_end, accessibilityMode: data.accessibility_mode, allowTranscription: data.allow_transcription });
    const { data: teacher } = data.teacher_id ? await supabase.from('users').select('name').eq('id', data.teacher_id).maybeSingle<{ name: string }>() : { data: null };
    setSession({ id: data.id, code: data.code, status: data.status, topic: data.topic, teacherName: teacher?.name, createdAt: data.created_at });
  }, []);

  const join = useCallback(async (code: string) => {
    if (!/^\d{4}$/.test(code)) {
      setJoinError('Digite os 4 dígitos do código da aula.');
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const data = await fetchActiveSessionByCode(code);
      if (!data) {
        setJoinError('Código não encontrado. Confira com o professor.');
        return;
      }
      await applySessionRow(data);
      writeStoredSessionCode(studentId, data.code);
    } catch {
      setJoinError('Não foi possível entrar na aula. Confira sua conexão e tente novamente.');
    } finally {
      setJoining(false);
    }
  }, [fetchActiveSessionByCode, applySessionRow, studentId]);

  // Reconecta sozinho se a página recarregar no meio de uma aula: sem isso,
  // o estado (em memória) zera e o aluno cai de volta na tela de código,
  // como se tivesse saído — mesmo a sessão continuando ativa no professor.
  useEffect(() => {
    if (!studentId || session) return;
    const storedCode = readStoredSessionCode(studentId);
    if (!storedCode) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchActiveSessionByCode(storedCode);
        if (cancelled) return;
        if (!data) {
          writeStoredSessionCode(studentId, null);
          return;
        }
        await applySessionRow(data);
      } catch {
        // Sem conexão no reload: mantém o código guardado pra tentar de novo depois.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentId, session, fetchActiveSessionByCode, applySessionRow]);

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
    writeStoredSessionCode(studentId, null);
    setSession(null);
    setActivity(null);
    setContentTrigger(null);
    setAnswered(false);
    setJoinError(null);
    setSessionConfig(null);
  }, [studentId]);

  const signalDoubt = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase.from('student_events').insert({ student_id: studentId, session_id: session.id, event_type: 'doubt_signaled', payload_json: {}, pf_earned: 0 });
    if (error) throw error;
  }, [session, studentId]);

  return { session, activity, contentTrigger, sessionConfig, answered, joining, joinError, join, submitAnswer, leave, signalDoubt };
}
