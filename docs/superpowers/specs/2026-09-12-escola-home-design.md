# EscolaHome — visão agregada e anonimizada

Status: approved for planning
Date: 2026-09-12

## Objetivo

Substituir o placeholder `EscolaHome.tsx` por um painel com sinais
agregados e anonimizados de bem-estar (humor) e engajamento (Intercepta +
Modo Aula) por turma/período, cumprindo a Regra de Ouro nº3 do AGENTS.md
(`GROUP BY class_id, date` com k-anonimato).

## Schema — buraco encontrado e correção necessária

Nenhuma tabela hoje registra a turma de um aluno: `users` não tem
`class_id`, e nem `checkin_humor` nem `intercepta_mission` carregam
`session_id` (só `activity_answer` do Modo Aula tem, via `sessions.class_id`).
Sem isso, "agregar por turma" é impossível pros dois primeiros.

### Migrations novas

1. `00008_add_student_class_id.sql`:
   ```sql
   alter table users add column class_id uuid references classes(id);
   ```
2. `00009_seed_student_class_assignment.sql`: associa os 5 alunos demo à
   Turma Demo (`44444444-4444-4444-4444-444444444444`).

## Views agregadas (k-anonimato, k = 3)

`00010_school_aggregate_views.sql`:

```sql
create view school_mood_stats as
select
  u.school_id,
  u.class_id,
  date_trunc('day', se.created_at)::date as day,
  se.payload_json->>'mood' as mood,
  count(distinct se.student_id) as student_count
from student_events se
join users u on u.id = se.student_id
where se.event_type = 'checkin_humor'
  and u.class_id is not null
  and u.school_id = (select school_id from users where id = auth.uid())
  and exists (select 1 from users me where me.id = auth.uid() and me.role = 'school_admin')
group by u.school_id, u.class_id, date_trunc('day', se.created_at)::date, se.payload_json->>'mood'
having count(distinct se.student_id) >= 3;

create view school_engagement_stats as
select
  u.school_id,
  u.class_id,
  date_trunc('day', se.created_at)::date as day,
  se.event_type,
  count(distinct se.student_id) as student_count
from student_events se
join users u on u.id = se.student_id
where se.event_type in ('intercepta_mission', 'activity_answer')
  and u.class_id is not null
  and u.school_id = (select school_id from users where id = auth.uid())
  and exists (select 1 from users me where me.id = auth.uid() and me.role = 'school_admin')
group by u.school_id, u.class_id, date_trunc('day', se.created_at)::date, se.event_type
having count(distinct se.student_id) >= 3;

grant select on school_mood_stats, school_engagement_stats to authenticated;
```

As views rodam com o privilégio de quem as criou (dono da tabela — padrão
Postgres para views sem `security_invoker`), então o `join`/`group by`
enxerga todas as linhas de `student_events` independente da RLS de
`student_events`. A segurança não vem de RLS na view (views não suportam
RLS própria) — vem do filtro embutido na própria definição: só retorna
linhas da escola de quem chama (`u.school_id = ... auth.uid() ...`) e só se
quem chama for `school_admin`. Nenhuma linha individual de aluno nunca sai
da view — só contagens agregadas com `HAVING count(distinct student_id) >=
3`. Sem Realtime aqui: é um histórico, não uma sessão ao vivo.

## Frontend

- `types/escola.ts`: `MoodStat { classId, day, mood: MoodValue,
  studentCount }`, `EngagementStat { classId, day, eventType:
  'intercepta_mission' | 'activity_answer', studentCount }`.
- `hooks/useSchoolStats.ts`: busca as duas views
  (`school_mood_stats`, `school_engagement_stats`) ordenadas por `day`;
  sem Realtime, `refetch` manual.
- `components/EscolaDashboard.tsx`: lista de humor agregado por dia (barra
  de contagem por emoji) + totais de engajamento (trocas de impulso,
  participação em Modo Aula) no período. Sem biblioteca de gráficos — barras
  simples em HTML/CSS, mesmo padrão visual do tally do `ModoAulaProfessor`.
  Estado vazio: "Sem dados suficientes ainda pra exibir com segurança"
  quando nenhum grupo atinge k=3 (normal numa turma pequena/demo recente).
- `pages/EscolaHome.tsx`: compõe o hook + componente, mantendo o header
  existente (`LogoutButton` já presente).

## Testes

- `useSchoolStats`: unit test com `supabase` mockado, mesmo padrão dos
  hooks anteriores.
- `EscolaDashboard`: testing-library cobrindo o estado vazio e a renderização
  de contagens agregadas.

## Fora de escopo

- Filtro de período customizável na UI (mostra tudo que a view retorna,
  sem seletor de data por enquanto).
- Gráficos com biblioteca externa.
- Matrícula de aluno em múltiplas turmas (`class_id` é singular, não
  histórico).
