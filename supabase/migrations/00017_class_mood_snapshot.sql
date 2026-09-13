-- supabase/migrations/00017_class_mood_snapshot.sql
--
-- Painel do professor ao entrar na aula: distribuição anônima do humor de
-- hoje da turma. Mesmo modelo de acesso de class_mood_performance
-- (00012): professor não tem SELECT em linhas individuais de
-- checkin_humor (CLAUDE.md §5, regra 1), a função agrega internamente e
-- só devolve contagem por faixa de humor, nunca por aluno (k-anonimato:
-- mínimo de 3 alunos distintos por faixa, CLAUDE.md §5, regra 3).
create or replace function class_mood_snapshot(p_class_id uuid)
returns table (
  mood text,
  count bigint
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
    count(distinct t.student_id)::bigint as count
  from (
    select distinct on (se.student_id)
      se.student_id,
      se.payload_json ->> 'mood' as mood
    from student_events se
    where se.event_type = 'checkin_humor'
      and se.created_at::date = current_date
      and se.student_id in (
        select se2.student_id
        from student_events se2
        join sessions s on s.id = se2.session_id
        where s.class_id = p_class_id
      )
    order by se.student_id, se.created_at desc
  ) t
  where t.mood is not null
  group by t.mood
  having count(distinct t.student_id) >= k_min
  order by array_position(array['muito_mal', 'mal', 'neutro', 'bem', 'muito_bem'], t.mood);
end;
$$;

grant execute on function class_mood_snapshot(uuid) to authenticated;
