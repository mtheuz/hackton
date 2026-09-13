import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Lesson, LessonConfig } from '../types/lesson';

interface LessonRow {
  id: string;
  class_id: string;
  name: string;
  subject: string;
  allow_notes: boolean;
  allow_free_chatbot: boolean;
  focus_mode: boolean;
  accessibility_mode: boolean;
}

function lessonFromRow(row: LessonRow): Lesson {
  return {
    id: row.id,
    classId: row.class_id,
    name: row.name,
    subject: row.subject,
    config: {
      allowNotes: row.allow_notes,
      allowFreeChatbot: row.allow_free_chatbot,
      focusMode: row.focus_mode,
      accessibilityMode: row.accessibility_mode,
    },
  };
}

interface UseLessonsResult {
  lessons: Lesson[];
  loading: boolean;
  createLesson: (classId: string, name: string, subject: string, config: LessonConfig) => Promise<string>;
  updateLesson: (lessonId: string, name: string, subject: string, config: LessonConfig) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
}

export function useLessons(teacherId: string): UseLessonsResult {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!teacherId) {
      setLessons([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('lessons')
      .select('id, class_id, name, subject, allow_notes, allow_free_chatbot, focus_mode, accessibility_mode')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });
    setLessons(((data ?? []) as LessonRow[]).map(lessonFromRow));
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createLesson = useCallback(
    async (classId: string, name: string, subject: string, config: LessonConfig) => {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          class_id: classId,
          teacher_id: teacherId,
          name,
          subject,
          allow_notes: config.allowNotes,
          allow_free_chatbot: config.allowFreeChatbot,
          focus_mode: config.focusMode,
          accessibility_mode: config.accessibilityMode,
        })
        .select('id')
        .single();
      if (error) throw error;
      await refetch();
      return (data as { id: string }).id;
    },
    [teacherId, refetch],
  );

  const updateLesson = useCallback(
    async (lessonId: string, name: string, subject: string, config: LessonConfig) => {
      const { error } = await supabase
        .from('lessons')
        .update({
          name,
          subject,
          allow_notes: config.allowNotes,
          allow_free_chatbot: config.allowFreeChatbot,
          focus_mode: config.focusMode,
          accessibility_mode: config.accessibilityMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lessonId);
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  return { lessons, loading, createLesson, updateLesson, deleteLesson };
}
