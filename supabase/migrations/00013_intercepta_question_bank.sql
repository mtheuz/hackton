-- supabase/migrations/00013_intercepta_question_bank.sql
--
-- Expande o banco de perguntas do Intercepta (era só 3 perguntas, uma por
-- matéria) pra sustentar o encadeamento automático de desafios sem repetir
-- a mesma pergunta toda hora. Mesma sessão-placeholder de
-- 00005_seed_intercepta_content.sql (BANCO1).
insert into activities (id, session_id, type, content_json) values
  (
    '66666666-6666-6666-6666-666666666671',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 9 x 6?","options":["45","54","56","64"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666672',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Qual é a raiz quadrada de 81?","options":["7","8","9","11"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666673',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 15% de 200?","options":["20","25","30","35"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666674',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 12 + 8 x 2?","options":["40","28","20","32"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666675',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Um triângulo tem quantos lados?","options":["2","3","4","5"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666676',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 100 dividido por 4?","options":["20","25","30","40"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666677',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual é o plural de \"animal\"?","options":["animals","animales","animais","animaus"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666678',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual palavra é um substantivo?","options":["Correr","Rápido","Casa","Muito"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666679',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual é o antônimo de \"feliz\"?","options":["Alegre","Triste","Contente","Sorridente"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667a',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual frase está no plural?","options":["O gato dorme","As casas são grandes","Ela estuda muito","Eu gosto de ler"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667b',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual palavra tem acento errado?","options":["Café","Você","Água","Familia"],"correct_index":3,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667c',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual é sinônimo de \"veloz\"?","options":["Lento","Rápido","Grande","Pequeno"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667d',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Quantos ossos tem o corpo humano adulto, aproximadamente?","options":["106","156","206","306"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667e',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual é o planeta mais próximo do Sol?","options":["Vênus","Mercúrio","Terra","Marte"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-66666666667f',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual é o estado físico da água em forma de vapor?","options":["Sólido","Líquido","Gasoso","Plasma"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666680',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual órgão bombeia sangue pelo corpo?","options":["Pulmão","Fígado","Coração","Rim"],"correct_index":2,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666681',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual gás os seres humanos liberam ao respirar?","options":["Oxigênio","Gás carbônico","Hidrogênio","Nitrogênio"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666682',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Quantos planetas existem no sistema solar?","options":["7","8","9","10"],"correct_index":1,"pf_reward":10}'
  );
