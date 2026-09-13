import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type {
  ActivityContent,
  ActivityType,
  LiveActivity,
  LiveSession,
  SessionConfig,
  TeacherClass,
} from '../types/modoAula';

const CONTENT_TRIGGER_BUCKET = 'content-triggers';

interface SessionRow {
  id: string;
  code: string;
  status: 'active' | 'finished';
  topic: string;
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

interface ClassRow {
  id: string;
  name: string;
  discipline_id: string | null;
}

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function configFromRow(row: SessionRow): SessionConfig {
  return {
    allowNotes: row.allow_notes,
    allowFreeChatbot: row.allow_free_chatbot,
    focusMode: row.focus_mode,
    quizAtEnd: row.quiz_at_end,
    accessibilityMode: row.accessibility_mode,
    allowTranscription: row.allow_transcription,
  };
}

interface UseTeacherSessionResult {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  loading: boolean;
  startSession: (classId: string, config: SessionConfig, topic: string) => Promise<void>;
  endSession: () => Promise<void>;
  launchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
  sendContentTrigger: (textContent: string, file: File | null, accessibilityCaption?: string) => Promise<void>;
  assignDiscipline: (classId: string, disciplineId: string) => Promise<void>;
}

export function useTeacherSession(teacherId: string): UseTeacherSessionResult {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchClasses = useCallback(async () => {
    if (!teacherId) {
      setClasses([]);
      return;
    }
    const { data } = await supabase.from('classes').select('id, name, discipline_id').eq('teacher_id', teacherId);
    setClasses(
      ((data ?? []) as ClassRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        disciplineId: row.discipline_id,
      })),
    );
  }, [teacherId]);

  const refetchSession = useCallback(async () => {
    if (!teacherId) {
      setSession(null);
      setSessionConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('sessions')
      .select('id, code, status, topic, allow_notes, allow_free_chatbot, focus_mode, quiz_at_end, accessibility_mode, allow_transcription')
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as SessionRow[];
    const current = rows[0] ?? null;
    setSession(current ? { id: current.id, code: current.code, status: current.status, topic: current.topic } : null);
    setSessionConfig(current ? configFromRow(current) : null);
    setLoading(false);
  }, [teacherId]);

  const refetchActivity = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ActivityRow[];
    const latest = rows[0] ?? null;
    setActivity(latest ? { id: latest.id, type: latest.type, content: latest.content_json } : null);
  }, []);

  useEffect(() => {
    void refetchClasses();
  }, [refetchClasses]);

  useEffect(() => {
    void refetchSession();
  }, [refetchSession]);

  useEffect(() => {
    if (!session) {
      setActivity(null);
      return;
    }
    void refetchActivity(session.id);

    const channel = supabase
      .channel(`teacher-activities-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `session_id=eq.${session.id}` },
        () => void refetchActivity(session.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, refetchActivity]);

  const startSession = useCallback(
    async (classId: string, config: SessionConfig, topic: string) => {
      let code = randomCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: taken } = await supabase
          .from('sessions')
          .select('id')
          .eq('code', code)
          .eq('status', 'active')
          .maybeSingle();
        if (!taken) break;
        code = randomCode();
      }

      const { error } = await supabase.from('sessions').insert({
        class_id: classId,
        teacher_id: teacherId,
        code,
        status: 'active',
        topic,
        allow_notes: config.allowNotes,
        allow_free_chatbot: config.allowFreeChatbot,
        focus_mode: config.focusMode,
        quiz_at_end: config.quizAtEnd,
        accessibility_mode: config.accessibilityMode,
        allow_transcription: config.allowTranscription ?? false,
      });
      if (error) throw error;
      await refetchSession();
    },
    [teacherId, refetchSession],
  );

  const endSession = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) throw error;
    setSession(null);
    setSessionConfig(null);
    setActivity(null);
  }, [session]);

  const launchActivity = useCallback(
    async (type: ActivityType, content: ActivityContent) => {
      if (!session) return;
      const { error } = await supabase.from('activities').insert({
        session_id: session.id,
        type,
        content_json: content,
      });
      if (error) throw error;
      await refetchActivity(session.id);
    },
    [session, refetchActivity],
  );

  const sendContentTrigger = useCallback(
    async (textContent: string, file: File | null, accessibilityCaption?: string) => {
      if (!session) return;

      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (file) {
        const ext = file.name.includes('.') ? file.name.split('.').pop() : null;
        filePath = `${session.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;
        const { error: uploadError } = await supabase.storage
          .from(CONTENT_TRIGGER_BUCKET)
          .upload(filePath, file, { contentType: file.type || undefined });
        if (uploadError) throw uploadError;
        fileName = file.name;
        fileType = file.type || null;
      }

      const { error } = await supabase.from('content_triggers').insert({
        session_id: session.id,
        text_content: textContent || null,
        file_path: filePath,
        file_name: fileName,
        file_type: fileType,
        accessibility_caption: accessibilityCaption ?? null,
      });
      if (error) throw error;
    },
    [session],
  );

  const assignDiscipline = useCallback(
    async (classId: string, disciplineId: string) => {
      const { error } = await supabase.from('classes').update({ discipline_id: disciplineId }).eq('id', classId);
      if (error) throw error;
      await refetchClasses();
    },
    [refetchClasses],
  );

  return {
    classes,
    session,
    sessionConfig,
    activity,
    loading,
    startSession,
    endSession,
    launchActivity,
    sendContentTrigger,
    assignDiscipline,
  };
}
