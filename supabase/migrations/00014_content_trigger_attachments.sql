-- supabase/migrations/00014_content_trigger_attachments.sql
--
-- Gatilho de conteúdo vira "material do professor": texto livre e/ou
-- arquivo anexo (jpg/pdf/doc/docx), sem mais a distinção fórmula/anotação.
-- Bucket privado + URL assinada (nunca público) — mesmo nível de acesso já
-- usado por content_triggers em si (qualquer autenticado lê a linha, só o
-- professor dono da sessão escreve), replicado aqui nas policies de
-- storage.objects.
alter table content_triggers
  drop column type,
  alter column content drop not null;

alter table content_triggers rename column content to text_content;

alter table content_triggers
  add column file_path text,
  add column file_name text,
  add column file_type text,
  add constraint content_triggers_has_content check (text_content is not null or file_path is not null);

insert into storage.buckets (id, name, public)
values ('content-triggers', 'content-triggers', false)
on conflict (id) do nothing;

create policy content_triggers_files_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'content-triggers'
    and (storage.foldername(name))[1] in (select id::text from sessions where teacher_id = auth.uid())
  );

create policy content_triggers_files_select_authenticated on storage.objects
  for select to authenticated
  using (bucket_id = 'content-triggers');

create policy content_triggers_files_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'content-triggers'
    and (storage.foldername(name))[1] in (select id::text from sessions where teacher_id = auth.uid())
  );
