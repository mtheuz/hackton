import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodPerformanceBucket, MoodValue } from '../types/intercepta';
import type { QuizContent } from '../types/modoAula';
import { MOCK_MOOD_PERFORMANCE_BUCKETS } from '../lib/mockMoodData';

interface MoodEventRow {
  created_at: string;
  payload_json: { mood: MoodValue };
}

interface InterceptaAnswerRow {
  created_at: string;
  payload_json: { correct: boolean };
}

interface ActivityAnswerRow {
  created_at: string;
  payload_json: { activity_id: string; type: string; selected_index?: number };
}

interface ActivityRow {
  id: string;
  type: string;
  content_json: QuizContent;
}

const MIN_ANSWERS_PER_BUCKET = 2;
const MOOD_ORDER: MoodValue[] = ['muito_mal', 'mal', 'neutro', 'bem', 'muito_bem'];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function useMoodPerformance(
  studentId: string,
): { buckets: MoodPerformanceBucket[]; loading: boolean; isMock: boolean } {
  const [buckets, setBuckets] = useState<MoodPerformanceBucket[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setBuckets([]);
      setIsMock(false);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: moodRows } = await supabase
      .from('student_events')
      .select('created_at, payload_json')
      .eq('student_id', studentId)
      .eq('event_type', 'checkin_humor')
      .order('created_at', { ascending: true });
    const moodByDay = new Map<string, MoodValue>();
    for (const row of (moodRows ?? []) as MoodEventRow[]) {
      moodByDay.set(dayKey(row.created_at), row.payload_json.mood);
    }

    const answers: { day: string; correct: boolean }[] = [];

    const { data: interceptaRows } = await supabase
      .from('student_events')
      .select('created_at, payload_json')
      .eq('student_id', studentId)
      .eq('event_type', 'intercepta_mission');
    for (const row of (interceptaRows ?? []) as InterceptaAnswerRow[]) {
      answers.push({ day: dayKey(row.created_at), correct: row.payload_json.correct });
    }

    const { data: activityAnswerRows } = await supabase
      .from('student_events')
      .select('created_at, payload_json')
      .eq('student_id', studentId)
      .eq('event_type', 'activity_answer');
    const quizAnswers = (activityAnswerRows ?? []) as ActivityAnswerRow[];
    const activityIds = [...new Set(quizAnswers.filter((a) => a.payload_json.type === 'quiz').map((a) => a.payload_json.activity_id))];

    if (activityIds.length > 0) {
      const { data: activityRows } = await supabase
        .from('activities')
        .select('id, type, content_json')
        .in('id', activityIds);
      const activitiesById = new Map(((activityRows ?? []) as ActivityRow[]).map((row) => [row.id, row]));

      for (const row of quizAnswers) {
        if (row.payload_json.type !== 'quiz') continue;
        const activity = activitiesById.get(row.payload_json.activity_id);
        if (!activity) continue;
        answers.push({
          day: dayKey(row.created_at),
          correct: row.payload_json.selected_index === activity.content_json.correct_index,
        });
      }
    }

    const tally = new Map<MoodValue, { correct: number; total: number }>();
    for (const answer of answers) {
      const mood = moodByDay.get(answer.day);
      if (!mood) continue;
      const entry = tally.get(mood) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (answer.correct) entry.correct += 1;
      tally.set(mood, entry);
    }

    const result: MoodPerformanceBucket[] = MOOD_ORDER.filter((mood) => (tally.get(mood)?.total ?? 0) >= MIN_ANSWERS_PER_BUCKET).map(
      (mood) => {
        const entry = tally.get(mood)!;
        return { mood, accuracy: Math.round((entry.correct / entry.total) * 100), sampleSize: entry.total };
      },
    );

    // Menos de 2 faixas com volume ainda não dá insight real — usa exemplo pra demo (produto.md: Raio-X pré-populado).
    if (result.length < 2) {
      setBuckets(MOCK_MOOD_PERFORMANCE_BUCKETS);
      setIsMock(true);
    } else {
      setBuckets(result);
      setIsMock(false);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { buckets, loading, isMock };
}
