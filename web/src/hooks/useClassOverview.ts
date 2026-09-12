import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { ClassOverview } from '../types/disciplina';
import type { ActivityContent, QuizContent } from '../types/modoAula';

interface SessionRow {
  id: string;
}

interface ActivityRow {
  id: string;
  type: string;
  content_json: ActivityContent;
}

interface AnswerRow {
  student_id: string;
  payload_json: { activity_id: string; type: string; selected_index?: number };
}

const EMPTY_OVERVIEW: ClassOverview = { sessionCount: 0, participantCount: 0, quizAccuracy: null };

export function useClassOverview(classId: string | null): { overview: ClassOverview; loading: boolean } {
  const [overview, setOverview] = useState<ClassOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!classId) {
      setOverview(EMPTY_OVERVIEW);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: sessionRows } = await supabase.from('sessions').select('id').eq('class_id', classId);
    const sessionIds = ((sessionRows ?? []) as SessionRow[]).map((row) => row.id);

    if (sessionIds.length === 0) {
      setOverview(EMPTY_OVERVIEW);
      setLoading(false);
      return;
    }

    const { data: activityRows } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .in('session_id', sessionIds);
    const activitiesById = new Map(((activityRows ?? []) as ActivityRow[]).map((row) => [row.id, row]));

    const { data: answerRows } = await supabase
      .from('student_events')
      .select('student_id, payload_json')
      .eq('event_type', 'activity_answer')
      .in('session_id', sessionIds);
    const answers = (answerRows ?? []) as AnswerRow[];

    const participantIds = new Set(answers.map((row) => row.student_id));

    let quizTotal = 0;
    let quizCorrect = 0;
    for (const answer of answers) {
      const activity = activitiesById.get(answer.payload_json.activity_id);
      if (!activity || activity.type !== 'quiz') continue;
      quizTotal += 1;
      const correctIndex = (activity.content_json as QuizContent).correct_index;
      if (answer.payload_json.selected_index === correctIndex) quizCorrect += 1;
    }

    setOverview({
      sessionCount: sessionIds.length,
      participantCount: participantIds.size,
      quizAccuracy: quizTotal === 0 ? null : Math.round((quizCorrect / quizTotal) * 100),
    });
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { overview, loading };
}
