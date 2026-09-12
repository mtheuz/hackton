-- supabase/migrations/00013_session_topic.sql
--
-- Professor define o tema da aula ao iniciar o Modo Aula (ex: "Frações",
-- "Segunda Guerra Mundial"). Distinto de classes.discipline_id (a matéria
-- fixa da turma, ex: "Matemática") — tema muda a cada sessão.
-- Obrigatoriedade é validada no front (ModoAulaProfessor), igual ao padrão
-- já usado pra pergunta/opções de atividade — sem check constraint aqui pra
-- não travar sessões antigas que ainda não tinham esse campo.
alter table sessions add column topic text not null default '';
