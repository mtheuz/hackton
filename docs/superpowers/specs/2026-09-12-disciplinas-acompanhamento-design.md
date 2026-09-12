# Gestão de Disciplina + Acompanhamento agregado (Professor)

Status: approved for planning
Date: 2026-09-12

## Objetivo

Duas peças pro professor:

1. **Gestão de disciplina**: professor cadastra/renomeia disciplinas
   (matéria/currículo) e associa cada turma sua a uma disciplina —
   substitui o texto livre que hoje não existe estruturado em lugar
   nenhum (turmas não têm noção de matéria).
2. **Acompanhamento agregado**: por turma, o professor vê sinais de como
   os alunos estão indo — sessões dadas, quantos alunos distintos
   participaram, % de acerto em quiz — **sempre agregado, nunca por
   nome de aluno** (Regra de Ouro do CLAUDE.md, confirmada explicitamente
   antes deste spec).

## Por que não dá pra ligar com o Raio-X/Domínio do Intercepta

Não existe matrícula aluno↔turma no schema (buraco já encontrado antes,
ao construir a visão da Escola). `domain_progress` é só
`student_id = auth.uid()` via RLS — o professor não tem e não vai ganhar
acesso a isso agora. O acompanhamento desta feature usa só o que já é
legitimamente visível pro professor: as próprias sessões de Modo Aula e
as respostas (`activity_answer`) que a RLS já libera
(`student_events_select_teacher_activity_answers`, de
`00006_teacher_activity_answers_rls.sql`). "Alunos da turma" aqui é
definido operacionalmente como "alunos distintos que responderam em
qualquer sessão daquela turma" — não uma matrícula declarada.

## Dados

### Tabela nova `disciplines`

```sql
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id),
  name text not null,
  created_at timestamptz not null default now()
);

alter table disciplines enable row level security;

create policy disciplines_select_own on disciplines
  for select using (teacher_id = auth.uid());
create policy disciplines_insert_own on disciplines
  for insert with check (teacher_id = auth.uid());
create policy disciplines_update_own on disciplines
  for update using (teacher_id = auth.uid());
```

Sem `delete` — evita lidar com FK de `classes.discipline_id` apontando
pra uma disciplina removida. Renomear cobre o caso de uso de correção.

### `classes` ganha `discipline_id`

```sql
alter table classes add column discipline_id uuid references disciplines(id);
```

Nullable — turma pode não ter disciplina atribuída ainda.
`classes_select_authenticated`/etc. (RLS existente) já cobrem leitura;
falta `update` pro professor poder atribuir disciplina à própria turma:

```sql
create policy classes_update_own on classes
  for update using (teacher_id = auth.uid());
```

(Hoje `classes` só tem policy de `select` — sem essa, o professor não
consegue fazer `update` pra setar `discipline_id`.)

## Acompanhamento — cálculo (100% client-side, sem RLS nova)

Pra uma turma (`class_id`), usando dados já lidos via RLS existente:

1. `sessions` onde `class_id = <turma>` e `teacher_id = auth.uid()` →
   conta sessões, pega os `session_id`s.
2. `student_events` onde `event_type = 'activity_answer'` e `session_id
   in (<session_ids>)` → conta `distinct student_id` (participantes) e
   junta com `activities` (por `activity_id` no `payload_json`, já
   legível via `activities_select_authenticated`) pra saber, nas do tipo
   `quiz`, se `selected_index` bateu com `correct_index` do
   `content_json` → % de acerto.

Nenhuma linha individual de aluno é exibida — só os três números
agregados por turma.

## Frontend

- `types/disciplina.ts`: `Discipline { id: string; name: string }`;
  `TeacherClassWithDiscipline extends TeacherClass { disciplineId: string
  | null }`; `ClassOverview { sessionCount: number; participantCount:
  number; quizAccuracy: number | null }` (`quizAccuracy` `null` quando
  não há nenhuma resposta de quiz ainda, pra distinguir de "0% de
  acerto").
- `hooks/useDisciplines.ts`: `{ disciplines: Discipline[]; loading:
  boolean; createDiscipline(name: string): Promise<void>;
  renameDiscipline(id: string, name: string): Promise<void> }`.
- `hooks/useClassOverview.ts`: `useClassOverview(classId: string):
  { overview: ClassOverview; loading: boolean }` — implementa o cálculo
  acima.
- `useTeacherSession` (existente) ganha `assignDiscipline(classId: string,
  disciplineId: string): Promise<void>` e `classes` passa a incluir
  `disciplineId` (fetch já seleciona a coluna nova).
- `components/DisciplinaManager.tsx`: lista de disciplinas + formulário
  de criar/renomear.
- `components/TurmaOverview.tsx`: por turma — seletor de disciplina
  (dropdown das disciplinas do professor) + os três números agregados.
- `pages/ProfessorHome.tsx`: ganha duas seções novas, abaixo do
  `ModoAulaProfessor` existente — `DisciplinaManager` e, pra cada turma
  do professor, um `TurmaOverview`.

## Testes

- `useDisciplines`, `useClassOverview`: unit tests com `supabase`
  mockado, mesmo padrão das outras suítes.
- `DisciplinaManager`, `TurmaOverview`: testing-library cobrindo criar
  disciplina, renomear, atribuir disciplina a turma, e renderização dos
  três números agregados (incluindo o estado "sem quiz ainda" →
  `quizAccuracy: null`).

## Fora de escopo

- Matrícula real aluno↔turma (mesma decisão já tomada na Escola).
- Deletar disciplina.
- Qualquer visão que ligue `domain_progress`/Raio-X ao professor.
- Tela dedicada de "criar turma" (só atribuição de disciplina a turmas
  já existentes).
