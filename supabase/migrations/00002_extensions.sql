-- supabase/migrations/00002_extensions.sql
create table domain_progress (
  student_id uuid not null references users(id),
  subject text not null,
  level integer not null default 1,
  pf_accumulated integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, subject)
);

create table intercepta_missions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id),
  activity_id uuid not null references activities(id),
  trigger_time timestamptz not null,
  completed_at timestamptz,
  dismissed_at timestamptz
);

create table student_risk_windows (
  student_id uuid primary key references users(id),
  windows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
