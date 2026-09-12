-- supabase/migrations/00011_disciplines.sql
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id),
  name text not null,
  created_at timestamptz not null default now()
);

alter table disciplines enable row level security;

create policy disciplines_select_own on disciplines
  for select using (teacher_id = auth.uid());
create policy disciplines_insert_own on disciplines
  for insert with check (teacher_id = auth.uid());
create policy disciplines_update_own on disciplines
  for update using (teacher_id = auth.uid());

alter table classes add column discipline_id uuid references disciplines(id);

create policy classes_update_own on classes
  for update using (teacher_id = auth.uid());
