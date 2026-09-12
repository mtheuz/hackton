# AlunoHome — Intercepta + Raio-X privado

Status: approved for planning
Date: 2026-09-12

## Objetivo

Substituir o placeholder `AlunoHome.tsx` por um fluxo funcional cobrindo os dois
recursos do aluno descritos no AGENTS.md:

1. **Intercepta**: missão de 3-5 minutos que interrompe o impulso de rede social
   com uma micro-atividade de estudo.
2. **Raio-X privado**: check-in de humor + progresso por matéria, visível
   apenas para o próprio aluno.

Escopo desta iteração: só a página do aluno. Modo Aula (professor) e a visão
agregada da escola ficam para depois.

## Dados

Nenhuma tabela nova — `00001_initial_schema.sql` e `00002_extensions.sql` já
cobrem tudo:

- `activities` (banco de conteúdo — reaproveitada como banco de missões)
- `intercepta_missions` (student_id, activity_id, trigger_time, completed_at)
- `domain_progress` (student_id, subject, level, pf_accumulated)
- `student_events` (event_type `checkin_humor` | `intercepta_mission`)

`activities.session_id` é `not null`, então o banco de missões vive dentro de
uma `sessions` "banco" (status `finished`, sem aula ao vivo associada) — não é
uma sessão de Modo Aula de verdade, só um container para o conteúdo.

### Nova migration: `00005_seed_intercepta_content.sql`

- 1 `sessions` do tipo banco, vinculada à turma demo existente.
- 3 `activities` tipo `quiz`, `content_json` com `{ subject, question, options[], correct_index }`.
- 1 `intercepta_missions` pendente para `aluno1@demo.foco` apontando pra uma
  dessas activities, `trigger_time = now()`.

Sem seed para `domain_progress` — a primeira missão concluída faz upsert.

## Componentes e hooks (`web/src`)

- `types/intercepta.ts`: `MissionActivity`, `InterceptaMission`, `DomainProgress`, `MoodCheckin`.
- `hooks/useInterceptaMission.ts`: busca missão pendente do aluno logado
  (`completed_at is null`, join `activities`), subscreve Realtime
  (`postgres_changes` em `intercepta_missions` filtrado por `student_id=eq.<self>`)
  para pegar inserts/updates sem refresh.
- `hooks/useDomainProgress.ts`: lista `domain_progress` do próprio aluno.
- `components/InterceptaCard.tsx`: renderiza a missão (pergunta + opções).
  Ao responder: grava `student_events` (`intercepta_mission`), marca
  `intercepta_missions.completed_at`, faz upsert em `domain_progress`
  (`pf_accumulated += pf_earned`). Estado otimista: desabilita botão e mostra
  feedback imediato antes da resposta do servidor.
- `components/CheckinHumor.tsx`: 5 emojis de humor. Clique grava
  `student_events` (`checkin_humor`, payload `{mood}`), mostra os últimos 5
  check-ins próprios como tira de emojis.
- Botão demo "Simular impulso": visível só quando não há missão pendente,
  insere uma nova linha em `intercepta_missions` escolhendo uma `activity`
  aleatória do banco de conteúdo da turma do aluno. Rotulado como
  demonstração (substitui o motor de detecção de impulso, fora de escopo).

### Placar — regra de ouro

`AlunoHome` mostra **"Trocas de impulso por estudo"** = `count(intercepta_missions
where student_id = self and completed_at is not null)`. Nunca tempo logado ou
tempo de tela.

## RLS

Já suficiente (`00003_rls_policies.sql`): todas as tabelas envolvidas têm
policy "own rows only" para o aluno, tanto select quanto insert/update.
Nenhuma mudança de RLS necessária.

## Testes

- `useInterceptaMission` / `useDomainProgress`: unit test com `supabase`
  mockado (mesmo padrão de `LoginPage.test.tsx`).
- `InterceptaCard`: responder à missão grava evento e desabilita UI
  (testing-library, mocks de insert/update encadeados).
- `CheckinHumor`: clique em emoji chama insert com payload certo.

## Fora de escopo

- Detecção real de impulso (o botão "Simular impulso" é só placeholder de demo).
- Push/notificação fora do navegador.
- Modo Aula e visão da Escola (páginas separadas, iterações futuras).
