-- supabase/migrations/00012_class_mood_performance.sql
--
-- Visão Professor: correlação anônima entre humor e taxa de acerto em quiz,
-- por turma. Professor não tem (e não deve ter) SELECT em linhas
-- individuais de checkin_humor (CLAUDE.md §5, regra 1) — a função junta
-- humor x resposta internamente e só devolve o agregado por faixa de
-- humor, nunca por aluno (k-anonimato: mínimo de 3 alunos distintos por
-- faixa, CLAUDE.md §5, regra 3).
--
-- Escopo: só Modo Aula (student_events.event_type = 'activity_answer',
-- ligado a sessions.class_id/teacher_id). Missões do Intercepta ficam de
-- fora — vivem numa sessão-placeholder sem relação real com turma/professor
-- (ver 00005_seed_intercepta_content.sql), então misturar os dois aqui
-- reintroduziria o mesmo problema de reidentificação que a função evita.
create or replace function class_mood_performance(p_class_id uuid)
returns table (
  mood text,
  accuracy numeric,
  sample_size bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  k_min constant int := 3;
begin
  if not exists (
    select 1 from sessions where class_id = p_class_id and teacher_id = auth.uid()
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    t.mood,
    round(100.0 * avg(t.is_correct::int), 1) as accuracy,
    count(distinct t.student_id)::bigint as sample_size
  from (
    select
      se.student_id,
      (se.payload_json ->> 'selected_index')::int = (a.content_json ->> 'correct_index')::int as is_correct,
      mood_lookup.mood
    from student_events se
    join sessions s on s.id = se.session_id
    join activities a on a.id = (se.payload_json ->> 'activity_id')::uuid
    join lateral (
      select m.payload_json ->> 'mood' as mood
      from student_events m
      where m.student_id = se.student_id
        and m.event_type = 'checkin_humor'
        and m.created_at <= se.created_at
        and m.created_at::date = se.created_at::date
      order by m.created_at desc
      limit 1
    ) mood_lookup on true
    where se.event_type = 'activity_answer'
      and a.type = 'quiz'::activity_type
      and s.class_id = p_class_id
      and s.teacher_id = auth.uid()
  ) t
  where t.mood is not null
  group by t.mood
  having count(distinct t.student_id) >= k_min
  order by array_position(array['muito_mal', 'mal', 'neutro', 'bem', 'muito_bem'], t.mood);
end;
$$;

grant execute on function class_mood_performance(uuid) to authenticated;
