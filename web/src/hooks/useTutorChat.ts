import { useCallback, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { ChatTurn } from '../types/tutor';

interface TutorFunctionResponse {
  reply: string;
}

interface TutorFunctionErrorBody {
  error: string;
  code: number;
}

let nextId = 0;
function makeId(): string {
  nextId += 1;
  return `turn-${nextId}`;
}

interface UseTutorChatResult {
  turns: ChatTurn[];
  sending: boolean;
  ask: (question: string) => Promise<void>;
  reset: () => void;
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: { json?: () => Promise<TutorFunctionErrorBody> } }).context;
    if (context?.json) {
      try {
        const body = await context.json();
        if (body?.error) return body.error;
      } catch {
        // fall through to the generic message below
      }
    }
  }
  return 'O tutor não conseguiu responder agora. Tenta de novo em instantes.';
}

export function useTutorChat(activityId: string | null): UseTutorChatResult {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sending, setSending] = useState(false);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setTurns((prev) => [...prev, { id: makeId(), role: 'student', content: trimmed }]);
      setSending(true);
      try {
        const { data, error } = await supabase.functions.invoke<TutorFunctionResponse>('tutor-restrito', {
          body: { question: trimmed, activity_id: activityId ?? undefined },
        });

        if (error) {
          const message = await extractErrorMessage(error);
          setTurns((prev) => [...prev, { id: makeId(), role: 'tutor', content: message }]);
          return;
        }

        setTurns((prev) => [...prev, { id: makeId(), role: 'tutor', content: data?.reply ?? '' }]);
      } catch {
        setTurns((prev) => [...prev, { id: makeId(), role: 'tutor', content: 'A conexão falhou. Envie sua pergunta novamente quando estiver conectado.' }]);
      } finally {
        setSending(false);
      }
    },
    [activityId],
  );

  const reset = useCallback(() => setTurns([]), []);

  return { turns, sending, ask, reset };
}
