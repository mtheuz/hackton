-- supabase/migrations/00010_session_config_and_content_triggers.sql
alter table sessions
  add column allow_notes boolean not null default false,
  add column allow_free_chatbot boolean not null default false,
  add column focus_mode boolean not null default false,
  add column quiz_at_end boolean not null default false,
  add column accessibility_mode boolean not null default false;

create table content_triggers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  type text not null check (type in ('formula', 'note')),
  content text not null,
  accessibility_caption text,
  created_at timestamptz not null default now()
);

alter table content_triggers enable row level security;

create policy content_triggers_insert_own_session on content_triggers
  for insert with check (session_id in (select id from sessions where teacher_id = auth.uid()));

create policy content_triggers_select_authenticated on content_triggers
  for select using (auth.role() = 'authenticated');
