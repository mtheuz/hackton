-- supabase/migrations/00008_school_daily_signals.sql
--
-- Visão Escola: sinais agregados e anonimizados de bem-estar/engajamento.
-- SECURITY DEFINER porque school_admin não tem (e não deve ter) SELECT em
-- linhas individuais de student_events (AGENTS.md §5, regra 1) — a função
-- calcula o agregado internamente e só devolve linhas com no mínimo
-- k_min registros no dia (k-anonimato, AGENTS.md §5, regra 3).
--
-- Limitação de schema: não existe matrícula aluno<->turma (só
-- sessions.class_id, que liga só eventos do Modo Aula a uma turma). Humor e
-- trocas de impulso, portanto, só podem ser agregados por escola, não por
-- turma — students não têm class_id na tabela users.
create or replace function school_daily_signals(p_days int default 14)
returns table (
  day date,
  metric text,
  value numeric,
  sample_size bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role user_role;
  caller_school_id uuid;
  k_min constant int := 5;
begin
  select role, school_id into caller_role, caller_school_id
  from users where id = auth.uid();

  if caller_role is distinct from 'school_admin' or caller_school_id is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select t.day, 'mood_avg'::text as metric, round(avg(t.score), 2) as value, count(*)::bigint as sample_size
  from (
    select
      (se.created_at at time zone 'utc')::date as day,
      case se.payload_json ->> 'mood'
        when 'muito_mal' then 1
        when 'mal' then 2
        when 'neutro' then 3
        when 'bem' then 4
        when 'muito_bem' then 5
      end as score
    from student_events se
    join users u on u.id = se.student_id
    where se.event_type = 'checkin_humor'
      and u.school_id = caller_school_id
      and se.created_at >= now() - (p_days || ' days')::interval
  ) t
  where t.score is not null
  group by t.day
  having count(*) >= k_min

  union all

  select t.day, 'trocas_impulso'::text, count(*)::numeric, count(*)::bigint
  from (
    select (se.created_at at time zone 'utc')::date as day
    from student_events se
    join users u on u.id = se.student_id
    where se.event_type = 'intercepta_mission'
      and u.school_id = caller_school_id
      and se.created_at >= now() - (p_days || ' days')::interval
  ) t
  group by t.day
  having count(*) >= k_min

  union all

  select t.day, 'modo_aula_respostas'::text, count(*)::numeric, count(*)::bigint
  from (
    select (se.created_at at time zone 'utc')::date as day
    from student_events se
    join users u on u.id = se.student_id
    where se.event_type = 'activity_answer'
      and u.school_id = caller_school_id
      and se.created_at >= now() - (p_days || ' days')::interval
  ) t
  group by t.day
  having count(*) >= k_min

  order by 1;
end;
$$;

grant execute on function school_daily_signals(int) to authenticated;
