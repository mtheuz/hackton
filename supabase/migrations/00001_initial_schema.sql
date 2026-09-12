-- supabase/migrations/00001_initial_schema.sql
create type user_role as enum ('student', 'teacher', 'school_admin');
create type session_status as enum ('active', 'finished');
create type activity_type as enum ('quiz', 'open_question', 'poll');

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role user_role not null,
  school_id uuid not null references schools(id),
  name text not null,
  created_at timestamptz not null default now()
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id),
  teacher_id uuid not null references users(id),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  teacher_id uuid not null references users(id),
  code text not null,
  status session_status not null default 'active',
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  type activity_type not null,
  content_json jsonb not null,
  created_at timestamptz not null default now()
);

create table student_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id),
  session_id uuid references sessions(id),
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  pf_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index student_events_student_id_idx on student_events(student_id);
create index student_events_session_id_idx on student_events(session_id);
