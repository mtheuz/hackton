# Fokido — Design de Implementação (MVP 12h)

Data: 2026-09-11
Status: aprovado pelo usuário em chat, pronto pra plano de implementação.

## 1. Contexto

Hackathon de 12h. Plataforma gamificada que ensina aluno a usar celular como
ferramenta de estudo dentro (Modo Aula) e fora (Intercepta) da escola.
Contexto legal: Lei 15.100/2025 (restrição de celular em aula, exceto uso
pedagógico) e Decreto 12.385/2025 (obrigação de identificar sofrimento
psíquico). Ver `claude.md` (AGENTS.md) e `produto.md` na raiz do repo pro
contexto completo de produto — este documento não repete o que já está lá,
só define como implementar.

Time: 2+ pessoas. Prioridade de demo: Modo Aula é o coração do pitch.

## 2. Princípio inegociável: tabela única de eventos

`student_events` é a única fonte de verdade de interação. Aluno, professor e
escola nunca têm tabelas separadas — têm queries/RLS diferentes sobre a
mesma tabela:
- Aluno: `student_id = auth.uid()`, vê só o próprio dado.
- Professor: agregado por `session_id`, nunca por `student_id` individual.
- Escola: agregado por `class_id` + período, nunca por aluno nem sessão
  individual, com k-anonimato mínimo (grupo de 5).

Qualquer feature nova que vaze identidade de aluno pro professor ou escola
está errada por definição — parar e perguntar antes de implementar.

## 3. Stack e estrutura de repo

Conforme `claude.md`: Go 1.22+ (Gin) em `/api`, React 18+/TS/Vite/Tailwind
em `/web`, Supabase (Postgres+Auth+Realtime+RLS) em `/supabase`. Estrutura
de diretórios exatamente como descrita lá (`api/cmd/server`,
`api/internal/{config,handler,middleware,model,repository,service}`,
`web/src/{components,hooks,pages,services,store,types}`,
`supabase/migrations`).

Auth do demo: **contas pré-semeadas** via Supabase Auth (professor, alunos
de uma turma, coordenação) — sem fluxo de cadastro real, evita coletar dado
real de menor e economiza tempo de build. Seed via migration/script SQL.

Tutor de IA: Gemini API, chamada só do backend Go (`api/internal/service`),
chave em variável de ambiente do backend, nunca no frontend.

## 4. Modelo de dados

Schema base (de `claude.md`, mantido):
```sql
users (id, email, role enum('student','teacher','school_admin'), school_id, created_at)
classes (id, school_id, teacher_id, name, code)
sessions (id, class_id, teacher_id, code, status enum('active','finished'), created_at, ended_at)
activities (id, session_id, type enum('quiz','open_question','poll'), content_json)
student_events (id, student_id, session_id nullable, event_type, payload_json, pf_earned int default 0, created_at)
```

Extensões pra este MVP:
```sql
domain_progress (student_id, subject, level int, pf_accumulated int, updated_at)
  -- PK (student_id, subject). RLS: só student_id = auth.uid() lê linha própria.

intercepta_missions (id, student_id, activity_id, trigger_time, completed_at, dismissed_at)
  -- RLS: só student_id = auth.uid().

student_risk_windows (student_id, windows jsonb, updated_at)
  -- PK student_id. RLS: só student_id = auth.uid().
```

`event_type` valores usados: `session_join`, `session_leave`,
`activity_answer`, `checkin_humor`, `intercepta_complete`,
`intercepta_dismiss`.

Views agregadas (sem exposição de linha individual):
```sql
session_live_stats   -- por session_id: % engajado, ponto de trava, domínio médio da turma
class_weekly_panel   -- por class_id + semana: tendência de humor, PF coletivo, k-anon >= 5
```

**Medidor coletivo:** soma cumulativa de PF por turma/semana. Nunca regride
porque é soma — nenhuma lógica extra de "não decrescer" é necessária, só
garantir que nenhum evento subtrai PF.

## 5. RLS — regras de ouro

1. `student_events`, `domain_progress`, `intercepta_missions`,
   `student_risk_windows`: `SELECT`/`INSERT` só onde `student_id = auth.uid()`.
   Nenhuma policy de professor ou escola pode ler linha individual dessas
   tabelas — só via views agregadas acima.
2. Views `session_live_stats` e `class_weekly_panel` calculadas com
   `COUNT`/`AVG`/`SUM` — nunca `SELECT *` de linha crua repassado pro
   professor/escola.
3. `class_weekly_panel` aplica `HAVING COUNT(DISTINCT student_id) >= 5` por
   grupo — abaixo disso, grupo não aparece (k-anonimato).
4. RLS habilitada desde a criação de cada tabela, sem exceção "temporária".

## 6. Backend Go — endpoints por fase

Toda rota autenticada extrai `user_id`+`role` do JWT Supabase no middleware.
Todo endpoint que recebe `session_id`/`activity_id`/`student_id` verifica
relação legítima (professor dono da sessão, aluno matriculado na turma da
sessão) antes de responder — nunca confiar em "ter o ID".

- **Fase 1 (Modo Aula):** `POST /sessions` (professor cria), `POST
  /sessions/:code/join` (aluno entra por código), `GET /sessions/:id/live`
  (fallback polling do painel), `POST
  /sessions/:id/activities/:activityId/answer`, `POST
  /sessions/:id/challenge` (desafio da semana, dobra PF), `POST
  /sessions/:id/end`.
- **Fase 2 (Gamificação):** `GET /students/me/domain-progress`, `GET
  /classes/:id/collective-meter`.
- **Fase 3 (Tutor):** `POST /tutor/chat` — recebe contexto da
  atividade+mensagem do aluno, injeta prompt fixo (seção 6.C do
  `claude.md`), chama Gemini, retorna pergunta-guia.
- **Fase 4 (Humor/Raio-X):** `POST /checkin`, `GET /students/me/raiox`
  (mistura heurística simples com dado pré-populado pra parte histórica da
  demo).
- **Fase 5 (Intercepta):** `POST /students/me/risk-windows`, `GET
  /students/me/intercepta/next`, `POST /intercepta/:id/complete`, `POST
  /intercepta/:id/dismiss` (sem penalidade nenhuma).
- **Fase 6 (Painel Escola, corta primeiro se faltar tempo):** `GET
  /schools/:id/weekly-panel`.

## 7. Realtime

Painel do professor assina Supabase Realtime em `student_events` filtrado
por `session_id`. Se o canal falhar na demo, fallback é polling do `GET
/sessions/:id/live` a cada 2-3s — não vale gastar tempo de hackathon
debugando WebSocket sob pressão.

## 8. Intercepta — notificação (decisão de escopo)

Push nativo real (service worker + VAPID) fica de fora do MVP — caro demais
pra 12h. Simulação: enquanto o app está aberto, um timer no frontend
compara horário atual com `student_risk_windows` e dispara um banner
in-app; se o navegador já concedeu permissão, dispara também `new
Notification()` local. Nenhuma infra de push de servidor. Esse é o corte
dentro da Fase 5 se o tempo apertar — a missão em si (Fase 5 completa) só
cai depois da Fase 6 no corte geral.

## 9. Fases de build e paralelização

Fase 0 (fundação, bloqueia tudo, sequencial): skeleton dos três diretórios,
migrations do schema base + extensões + RLS completa, Go com middleware
JWT, React com rotas por ator (`/aluno`, `/professor`, `/escola`) e cliente
Supabase, seed de contas pré-semeadas.

Depois da Fase 0, paraleliza:
- Par A → Fase 1 (Modo Aula) → Fase 2 (Gamificação).
- Par B → Fase 3 (Tutor) → Fase 4 (Humor/Raio-X) → Fase 5 (Intercepta).
- Fase 6 (Painel Escola) só se sobrar tempo — primeiro corte de escopo.

## 10. Segurança — checklist herdado do claude.md

- RLS em toda tabela desde a criação, sem exceção.
- RBAC validado de novo no backend Go, não só escondido no frontend.
- IDOR: todo endpoint com ID verifica relação legítima do usuário autenticado.
- Chave Gemini só no backend Go, nunca no frontend/Vite bundle.
- Service role key do Supabase só no backend Go, só onde agregação
  legitimamente precisa cruzar RLS (ex.: `class_weekly_panel`).
- `gosec`/`govulncheck` no backend antes de qualquer merge.

## 11. Testes

- Go: `go test -v -race ./...` nos services de sessão/PF/tutor.
- RLS: teste de policy garantindo que aluno A não lê evento de aluno B, e
  que query "de professor" nunca retorna `student_id`.
- Frontend: `npm run lint && npm run typecheck`.
- Manual: fluxo ponta-a-ponta Modo Aula (criar sessão → aluno entra →
  responde → painel atualiza → encerra) antes da demo.

## 12. Fora de escopo (não implementar sem alinhar)

Bloqueio nativo de apps, painel completo de controle parental, geração
automática de missão via IA a partir de resumo do professor, suporte a
Fundamental 1, push nativo real (ver seção 8), cadastro real de usuário
(ver seção 3).
