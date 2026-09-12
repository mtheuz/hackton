-- supabase/migrations/00007_teacher_session_write_rls.sql
-- 00003 only granted SELECT on sessions/activities to any authenticated
-- user. Modo Aula needs the teacher to actually create/update their own
-- sessions and launch activities inside them.
create policy sessions_insert_own on sessions
  for insert with check (teacher_id = auth.uid());

create policy sessions_update_own on sessions
  for update using (teacher_id = auth.uid());

create policy activities_insert_own_session on activities
  for insert with check (session_id in (select id from sessions where teacher_id = auth.uid()));
