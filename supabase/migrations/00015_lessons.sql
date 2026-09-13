-- supabase/migrations/00015_lessons.sql
--
-- "Aula" (lesson) é um molde reutilizável dentro de uma turma: nome,
-- assunto, config (mesmas 4 chaves relevantes de SessionConfig) e uma
-- apresentação (lesson_slides, sequência ordenada de quiz/enquete/pergunta
-- aberta/material). "Iniciar Modo Aula" a partir de uma aula cria uma
-- sessão ao vivo (sessions, já existente) copiando a config/assunto da
-- aula; os slides viram activities/content_triggers um de cada vez
-- conforme o professor avança.
create table lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  teacher_id uuid not null references users(id),
  name text not null,
  subject text not null,
  allow_notes boolean not null default false,
  allow_free_chatbot boolean not null default false,
  focus_mode boolean not null default false,
  accessibility_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table lesson_slides (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  position integer not null,
  slide_type text not null check (slide_type in ('quiz', 'poll', 'open_question', 'material')),
  content_json jsonb,
  text_content text,
  file_path text,
  file_name text,
  file_type text,
  accessibility_caption text,
  created_at timestamptz not null default now(),
  constraint lesson_slides_activity_has_content check (
    slide_type = 'material' or content_json is not null
  ),
  constraint lesson_slides_material_has_content check (
    slide_type != 'material' or text_content is not null or file_path is not null
  )
);

create index lesson_slides_lesson_id_idx on lesson_slides(lesson_id, position);

alter table lessons enable row level security;
alter table lesson_slides enable row level security;

create policy lessons_select_own on lessons
  for select using (teacher_id = auth.uid());
create policy lessons_insert_own on lessons
  for insert with check (teacher_id = auth.uid());
create policy lessons_update_own on lessons
  for update using (teacher_id = auth.uid());
create policy lessons_delete_own on lessons
  for delete using (teacher_id = auth.uid());

create policy lesson_slides_select_own on lesson_slides
  for select using (lesson_id in (select id from lessons where teacher_id = auth.uid()));
create policy lesson_slides_insert_own on lesson_slides
  for insert with check (lesson_id in (select id from lessons where teacher_id = auth.uid()));
create policy lesson_slides_update_own on lesson_slides
  for update using (lesson_id in (select id from lessons where teacher_id = auth.uid()));
create policy lesson_slides_delete_own on lesson_slides
  for delete using (lesson_id in (select id from lessons where teacher_id = auth.uid()));

-- Materiais de slide de aula reaproveitam o bucket já criado em
-- 00014_content_trigger_attachments.sql (content-triggers), só que sob o
-- prefixo lessons/<lesson_id>/ em vez de <session_id>/. A policy de select
-- de lá já libera o bucket inteiro pra qualquer autenticado — sem mudança
-- necessária ali. Ao "lançar" um slide de material numa sessão ao vivo, o
-- content_trigger novo aponta pro MESMO arquivo (file_path), sem re-upload.
create policy lesson_materials_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content-triggers'
    and (storage.foldername(name))[1] = 'lessons'
    and (storage.foldername(name))[2] in (select id::text from lessons where teacher_id = auth.uid())
  );

create policy lesson_materials_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content-triggers'
    and (storage.foldername(name))[1] = 'lessons'
    and (storage.foldername(name))[2] in (select id::text from lessons where teacher_id = auth.uid())
  );
