# Modo Aula (Professor + Aluno, loop completo)

Status: approved for planning
Date: 2026-09-12

## Objetivo

Substituir o placeholder `ProfessorHome.tsx` por um Modo Aula funcional:
professor abre uma sessão de aula com código de 4 dígitos, lança atividades
(quiz, enquete, pergunta aberta) e vê engajamento em tempo real; alunos da
turma entram com o código e respondem ao vivo. Loop completo, sem
gamificação/PF (isso é do Intercepta, sistema separado).

## Dados

Nenhuma tabela nova. `sessions`, `activities`, `student_events` já cobrem o
fluxo (`00001_initial_schema.sql`). Um ajuste de RLS é necessário:

### RLS: professor lê respostas da própria sessão

Hoje `student_events_select_own` restringe toda leitura a `student_id =
auth.uid()` — nenhum professor consegue ver nada, nem agregado. Adicionar:

```sql
create policy student_events_select_teacher_activity_answers on student_events
  for select using (
    event_type = 'activity_answer'
    and session_id in (select id from sessions where teacher_id = auth.uid())
  );
```

Escopo estrito: só `event_type = 'activity_answer'`, só sessões do próprio
professor. `checkin_humor` e `intercepta_mission` continuam invisíveis pra
qualquer um além do próprio aluno — a regra de ouro do Raio-X não muda.

### Forma dos dados por tipo de atividade

`activities.content_json` (por `activities.type`):
- `quiz`: `{ question: string, options: string[], correct_index: number }`
- `poll`: `{ question: string, options: string[] }`
- `open_question`: `{ question: string }`

Resposta do aluno em `student_events`:
`{ event_type: 'activity_answer', session_id, payload_json: { activity_id,
type, selected_index? , text? }, pf_earned: 0 }` — sempre `pf_earned: 0`
(Modo Aula não gera PF).

Código da sessão: 4 dígitos, gerado no client, sem constraint de unicidade
no banco (fora de escopo pra este MVP — checagem de colisão é feita
consultando sessões `active` com aquele código antes de inserir).

## Fluxo Professor (`ProfessorHome` + `ModoAulaProfessor`)

1. **Sem sessão ativa**: lista as turmas do professor (`classes` onde
   `teacher_id = auth.uid()`) e botão "Iniciar Modo Aula" — cria `sessions`
   (`class_id`, `teacher_id`, `code`, `status: 'active'`).
2. **Sessão ativa, sem atividade lançada ainda**: mostra o código em
   destaque + formulário pra lançar atividade (seletor de tipo, campo de
   pergunta, campos de opção dinâmicos pra quiz/enquete, seletor de opção
   correta pra quiz).
3. **Atividade lançada**: mostra a pergunta + tally ao vivo — barras de %
   por opção (quiz/enquete) ou lista de respostas de texto (pergunta
   aberta), sem identificar o aluno. "Nova atividade" volta ao formulário
   (a mais recente `activities` da sessão é sempre "a atual" — sem campo de
   estado extra pra isso).
4. **"Encerrar aula"**: `sessions.status = 'finished'`.

## Fluxo Aluno (novo card `ModoAulaAluno`, dentro do `AlunoHome`)

1. **Não entrou**: campo de código (4 dígitos) + "Entrar na aula" — busca
   `sessions` com aquele `code` e `status = 'active'`.
2. **Entrou, sem atividade**: "Aguardando o professor iniciar uma
   atividade...".
3. **Atividade ativa, não respondida**: quiz/enquete viram botões de opção;
   pergunta aberta vira textarea + "Enviar".
4. **Respondida**: "Resposta enviada! Aguardando o professor." (reseta ao
   detectar uma nova atividade via Realtime).
5. **Sessão encerrada** (`status` muda pra `finished`): aviso + botão pra
   sair do card (volta ao estado "não entrou").

## Realtime

Mesmo padrão já usado no Intercepta (`postgres_changes`, sem Broadcast):
- Aluno: subscreve `activities` (filtro `session_id=eq.<id>`) pra saber
  quando uma atividade nova é lançada, e `sessions` (filtro `id=eq.<id>`)
  pra detectar o fim da aula.
- Professor: subscreve `student_events` (filtro `session_id=eq.<id>`) pra
  atualizar o tally ao vivo — a RLS nova já garante que só as linhas
  `activity_answer` daquela sessão chegam pra ele.

## Componentes, hooks e tipos (`web/src`)

- `types/modoAula.ts`: `ActivityType`, `QuizContent`, `PollContent`,
  `OpenQuestionContent`, `ActivityContent`, `LiveActivity { id, type,
  content }`, `LiveSession { id, code, status }`, `AnswerTally` (contagem
  por opção ou lista de textos).
- `hooks/useTeacherSession.ts`: ciclo de vida da sessão do professor
  (turmas, sessão ativa, `startSession`, `endSession`, `launchActivity`,
  atividade atual).
- `hooks/useSessionLiveStats.ts`: tally ao vivo pra uma `activity_id` de
  uma sessão.
- `hooks/useLiveSession.ts`: lado do aluno — `join(code)`, sessão/atividade
  atual, `submitAnswer`, `leave`.
- `components/ModoAulaProfessor.tsx`: painel de controle completo do
  professor (usa os dois hooks de professor).
- `components/ModoAulaAluno.tsx`: card de entrar/responder do aluno (usa
  `useLiveSession`).
- `pages/ProfessorHome.tsx`: compõe `ModoAulaProfessor`.
- `pages/AlunoHome.tsx`: ganha uma seção a mais com `ModoAulaAluno`.

## Testes

- `useTeacherSession`/`useSessionLiveStats`/`useLiveSession`: unit tests
  com `supabase` mockado, mesmo padrão do Intercepta
  (`useInterceptaMission.test.ts`).
- `ModoAulaProfessor`/`ModoAulaAluno`: testing-library cobrindo os
  principais estados/transições (iniciar sessão, lançar atividade, entrar
  com código, responder).

## Fora de escopo

- Constraint de unicidade de `sessions.code` no banco.
- PF/gamificação para respostas de Modo Aula.
- Página da Escola (visão agregada anonimizada) — fica pra depois.
- Tutor Restrito com IA — fica pra depois.
