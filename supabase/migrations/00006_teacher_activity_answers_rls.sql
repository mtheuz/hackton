-- supabase/migrations/00006_teacher_activity_answers_rls.sql
create policy student_events_select_teacher_activity_answers on student_events
  for select using (
    event_type = 'activity_answer'
    and session_id in (select id from sessions where teacher_id = auth.uid())
  );
