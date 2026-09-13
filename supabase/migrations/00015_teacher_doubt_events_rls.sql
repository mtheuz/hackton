do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_events'
      and policyname = 'student_events_select_teacher_doubts'
  ) then
    create policy student_events_select_teacher_doubts on student_events
      for select using (
        event_type = 'doubt_signaled'
        and session_id in (select id from sessions where teacher_id = auth.uid())
      );
  end if;
end $$;
