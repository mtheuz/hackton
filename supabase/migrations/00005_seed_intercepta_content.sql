-- supabase/migrations/00005_seed_intercepta_content.sql

-- "Banco" session: container for Intercepta content, not a live Modo Aula
-- session (activities.session_id is not null, so it needs somewhere to live).
insert into sessions (id, class_id, teacher_id, code, status) values
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'BANCO1',
    'finished'
  );

insert into activities (id, session_id, type, content_json) values
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 7 x 8?","options":["54","56","58","64"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual é o plural de \"cidadão\"?","options":["cidadões","cidadãos","cidadães","cidadão"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual gás as plantas absorvem na fotossíntese?","options":["Oxigênio","Nitrogênio","Gás carbônico","Hidrogênio"],"correct_index":2,"pf_reward":10}'
  );

insert into intercepta_missions (id, student_id, activity_id, trigger_time) values
  (
    '77777777-7777-7777-7777-777777777771',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666661',
    now()
  );
