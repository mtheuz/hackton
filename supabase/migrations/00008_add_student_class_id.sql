-- supabase/migrations/00008_add_student_class_id.sql
alter table users add column class_id uuid references classes(id);
