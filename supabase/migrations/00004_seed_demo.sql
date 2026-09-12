-- supabase/migrations/00004_seed_demo.sql
create extension if not exists pgcrypto;

insert into schools (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Escola Demo');

-- auth.users: local-dev-only pattern for pre-seeded accounts.
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'professor@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000000', 'aluno1@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'aluno2@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222223', '00000000-0000-0000-0000-000000000000', 'aluno3@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222224', '00000000-0000-0000-0000-000000000000', 'aluno4@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('22222222-2222-2222-2222-222222222225', '00000000-0000-0000-0000-000000000000', 'aluno5@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'coordenacao@demo.foco', crypt('demo1234', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{}', '{}', now(), now(), '', '', '', '', '');

insert into users (id, email, role, school_id, name) values
  ('11111111-1111-1111-1111-111111111111', 'professor@demo.foco', 'teacher', '00000000-0000-0000-0000-000000000001', 'Professor Demo'),
  ('22222222-2222-2222-2222-222222222221', 'aluno1@demo.foco', 'student', '00000000-0000-0000-0000-000000000001', 'Aluno 1'),
  ('22222222-2222-2222-2222-222222222222', 'aluno2@demo.foco', 'student', '00000000-0000-0000-0000-000000000001', 'Aluno 2'),
  ('22222222-2222-2222-2222-222222222223', 'aluno3@demo.foco', 'student', '00000000-0000-0000-0000-000000000001', 'Aluno 3'),
  ('22222222-2222-2222-2222-222222222224', 'aluno4@demo.foco', 'student', '00000000-0000-0000-0000-000000000001', 'Aluno 4'),
  ('22222222-2222-2222-2222-222222222225', 'aluno5@demo.foco', 'student', '00000000-0000-0000-0000-000000000001', 'Aluno 5'),
  ('33333333-3333-3333-3333-333333333333', 'coordenacao@demo.foco', 'school_admin', '00000000-0000-0000-0000-000000000001', 'Coordenação Demo');

insert into classes (id, school_id, teacher_id, name, code) values
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Turma Demo', 'TURMA1');
