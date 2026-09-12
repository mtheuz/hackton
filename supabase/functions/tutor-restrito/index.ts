// supabase/functions/tutor-restrito/index.ts
//
// Tutor Restrito: assistente pedagógico com IA que nunca entrega a resposta
// pronta. Usa questionamento socrático (scaffolding) — ver AGENTS.md §6.C.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SYSTEM_PROMPT = `Você é o Tutor Restrito do Fokido, um assistente pedagógico para estudantes do Ensino Fundamental II e Ensino Médio.
REGRAS INEGOCIÁVEIS:
1. NUNCA forneça a resposta pronta para a pergunta do aluno.
2. Responda SEMPRE com uma pergunta orientadora, uma dica conceitual ou uma decomposição do problema em etapas menores.
3. Se o aluno pedir a resposta direta, explique gentilmente que seu papel é ajudá-lo a pensar e raciocinar por conta própria.
4. Mantenha o tom encorajador, simples e focado no conteúdo da aula do dia.`;

const ANTHROPIC_MODEL = Deno.env.get('TUTOR_MODEL') ?? 'claude-haiku-4-5-20251001';
const MAX_QUESTION_LENGTH = 2000;

interface TutorRequest {
  question: string;
  activity_id?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed', code: 405 }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'missing authorization header', code: 401 }, 401);
  }

  // Client scoped to the caller's own JWT — every query below runs under
  // that user's RLS policies, so this function never needs the service role.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: 'invalid session', code: 401 }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', userData.user.id)
    .single();
  if (profileError || !profile) {
    return jsonResponse({ error: 'profile not found', code: 404 }, 404);
  }
  if (profile.role !== 'student') {
    return jsonResponse({ error: 'tutor restrito é exclusivo para alunos', code: 403 }, 403);
  }

  let body: TutorRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'corpo inválido', code: 400 }, 400);
  }

  const question = body.question?.trim();
  if (!question) {
    return jsonResponse({ error: 'question é obrigatório', code: 400 }, 400);
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse({ error: 'question excede o tamanho máximo', code: 400 }, 400);
  }

  // Optional grounding: pull the activity's own content so the tutor can
  // scaffold around the actual question the student is stuck on, instead of
  // trusting free text from the client about what the activity says.
  let activityContext = '';
  if (body.activity_id) {
    const { data: activity } = await supabase
      .from('activities')
      .select('type, content_json')
      .eq('id', body.activity_id)
      .single();
    if (activity) {
      activityContext = `\n\nContexto da atividade (${activity.type}): ${JSON.stringify(activity.content_json)}`;
    }
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'tutor indisponível no momento', code: 503 }, 503);
  }

  let reply: string;
  try {
    reply = await callAnthropic(apiKey, question + activityContext);
  } catch (err) {
    console.error('anthropic call failed', err);
    return jsonResponse({ error: 'tutor indisponível no momento', code: 502 }, 502);
  }

  const { error: logError } = await supabase.from('student_events').insert({
    student_id: userData.user.id,
    session_id: null,
    event_type: 'tutor_message',
    payload_json: { question, reply, activity_id: body.activity_id ?? null },
  });
  if (logError) {
    console.error('failed to log tutor interaction', logError);
  }

  return jsonResponse({ reply }, 200);
});

async function callAnthropic(apiKey: string, userMessage: string, attempt = 1): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (res.status === 429 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
    return callAnthropic(apiKey, userMessage, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`anthropic error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('resposta inesperada do modelo');
  }
  return text;
}
