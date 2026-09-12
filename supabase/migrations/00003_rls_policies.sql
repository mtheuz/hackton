alter table schools enable row level security;
alter table users enable row level security;
alter table classes enable row level security;
alter table sessions enable row level security;
alter table activities enable row level security;
alter table student_events enable row level security;
alter table domain_progress enable row level security;
alter table intercepta_missions enable row level security;
alter table student_risk_windows enable row level security;

-- users: a person can read their own row
create policy users_select_self on users
  for select using (id = auth.uid());

-- classes/sessions/activities: readable by any authenticated user for now
-- (fine-grained teacher/student class membership checks land with the
-- Fase 1 endpoints, which also re-check in Go per spec §6).
create policy classes_select_authenticated on classes
  for select using (auth.role() = 'authenticated');
create policy sessions_select_authenticated on sessions
  for select using (auth.role() = 'authenticated');
create policy activities_select_authenticated on activities
  for select using (auth.role() = 'authenticated');

-- student_events: strictly own rows only, for every actor
create policy student_events_select_own on student_events
  for select using (student_id = auth.uid());
create policy student_events_insert_own on student_events
  for insert with check (student_id = auth.uid());

-- domain_progress: strictly own rows only
create policy domain_progress_select_own on domain_progress
  for select using (student_id = auth.uid());
create policy domain_progress_upsert_own on domain_progress
  for insert with check (student_id = auth.uid());
create policy domain_progress_update_own on domain_progress
  for update using (student_id = auth.uid());

-- intercepta_missions: strictly own rows only
create policy intercepta_select_own on intercepta_missions
  for select using (student_id = auth.uid());
create policy intercepta_insert_own on intercepta_missions
  for insert with check (student_id = auth.uid());
create policy intercepta_update_own on intercepta_missions
  for update using (student_id = auth.uid());

-- student_risk_windows: strictly own row only
create policy risk_windows_select_own on student_risk_windows
  for select using (student_id = auth.uid());
create policy risk_windows_upsert_own on student_risk_windows
  for insert with check (student_id = auth.uid());
create policy risk_windows_update_own on student_risk_windows
  for update using (student_id = auth.uid());
