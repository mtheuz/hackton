# CLAUDE.md — Foco

Guia de contexto pra Claude Code trabalhar neste repositório. Leia isto antes de qualquer tarefa.

## O que é o produto

Plataforma gamificada e educacional que ensina o aluno a usar o celular como ferramenta de estudo — dentro da sala de aula (guiado pelo professor) e fora dela (interceptando o momento de distração e oferecendo estudo no lugar). Feita pra um hackathon de 12h sobre "uso consciente de smartphones nas escolas", com três atores: **aluno**, **professor**, **coordenação escolar**.

Contexto legal relevante (Brasil): Lei 15.100/2025 restringe uso de celular em aulas/recreio, exceto uso pedagógico autorizado pelo professor. Decreto 12.385/2025 obriga escolas a ter estratégias de identificação de sofrimento psíquico. O produto existe pra atender essas duas obrigações, não pra contorná-las.

Documento de produto completo (peças do MVP, fluxo de telas, modelo de dados de referência) está em `produto.md` (raiz do repo) — leia antes de implementar qualquer feature nova pra entender o "porquê", não só o "o quê". `produto.md` tem uma seção "Status de implementação" que reflete o estado real do código — mais confiável que a visão original pra saber o que já existe.

## Stack

**Sem backend próprio.** Toda a plataforma roda em Supabase — decisão travada durante a implementação (o hackathon não comportava também manter um backend Go em paralelo; ver `docs/superpowers/plans/2026-09-11-fundacao.md` pra o histórico dessa virada).

- **Frontend:** React + TypeScript + Vite + TailwindCSS, `@supabase/supabase-js` direto (sem camada HTTP própria).
- **Banco/Auth/Realtime/RBAC:** Supabase (Postgres + Row Level Security + Supabase Auth + Realtime channels). RLS é o único ponto de controle de acesso — não existe validação de role redundante em servidor próprio.
- **IA (tutor restrito):** Supabase Edge Function (`supabase/functions/tutor-restrito`, Deno/TS) chamada direto do frontend via `supabase.functions.invoke(...)`. A function roda com o JWT do próprio aluno (nunca service role) e injeta a chave da API de IA a partir de um secret do projeto — o frontend nunca vê essa chave. Isso substitui "chamada via backend Go" do texto antigo: aqui "nunca no frontend" significa "a chave fica só no secret da Edge Function", não "existe um servidor Go no meio".

### Por que Supabase aqui (sem backend próprio)
Prazo de hackathon não comporta implementar auth, RLS manual e pub/sub do zero, nem manter um segundo serviço (Go) rodando/deployado em paralelo. Supabase resolve auth, Realtime (painel do professor ao vivo, gatilhos de conteúdo, tudo via `postgres_changes`) e controle de acesso (RLS) de uma vez, direto no banco — não só na aplicação. Edge Functions cobrem o único caso que precisa de segredo de servidor (chamada à IA do tutor).

## O princípio de dados que rege tudo

**Um evento, três agregações.** Toda ação (entrar/sair de sessão, responder atividade, completar missão, check-in de humor) grava uma linha em `student_events` (`event_type` + `payload_json`). Aluno, professor e escola nunca têm tabelas separadas — têm **políticas RLS diferentes** sobre a mesma tabela:

- Aluno: `student_id = auth.uid()` — só vê o próprio dado, sempre (policy `student_events_select_own`).
- Professor: agregado por `session_id` (via join com `sessions.teacher_id = auth.uid()`), nunca dá pra listar qual aluno especificamente errou ou saiu do foco — a policy `student_events_select_teacher_activity_answers` só libera `event_type = 'activity_answer'`, nunca `checkin_humor`. Se uma feature nova expõe isso, pare e pergunte antes de implementar.
- Escola: agregado por `class_id`/`school_id` ao longo do tempo via função/view com k-anonimato (mínimo de alunos distintos por grupo) — nunca por aluno, nunca por sessão individual. Views/funções de agregação da escola bypassam a RLS da tabela base de propósito (rodam com privilégio de quem as criou), então a segurança vem do filtro embutido na própria query (escola do chamador + role), não de RLS na view — visto que views não suportam RLS própria.

Isso não é só arquitetura, é a defesa de privacidade do produto. Trate como regra de negócio inviolável, não como detalhe de implementação. Nomenclatura real das tabelas (inglês, já implementado): `users`, `schools`, `classes`, `sessions`, `activities`, `student_events`, `domain_progress`, `intercepta_missions`, `student_risk_windows` — ver `produto.md` § Modelo de dados.

## Regras de mecânica de produto (não inverter sem confirmar com o time)

- **O app nunca silencia o celular no nível do sistema operacional.** "Modo foco" é só dentro da própria experiência (tela cheia + Page Visibility API). Isso é limite técnico de PWA — se alguém pedir pra implementar silenciamento real de notificações de outros apps, isso exige app nativo com Accessibility Service e está fora de escopo. Não gastar tempo tentando.

- **Saída de sessão/missão é graciosa.** Nunca implementar lógica que penalize ou zere progresso coletivo quando um aluno sai. Ele perde só o bônus daquele momento; o progresso acumulado (PF, Domínio) nunca regride.
- **Pontos de Foco (PF) recompensam decisão, não tempo de tela.** Nunca criar uma métrica ou campo que meça "tempo total no app" como sinal de sucesso — isso contradiz o propósito do produto. Métrica correta: contagem de missões/atividades completadas.
- **Tutor de IA nunca entrega resposta pronta.** Qualquer mudança no prompt de sistema do tutor precisa preservar isso — é o motivo do tutor existir.

## Segurança — não negociável mesmo sob pressão de tempo

Dados aqui são de menores de idade (alunos de Fundamental 2 e Médio) e incluem estado emocional (check-in de humor). Trate como dado sensível por padrão.

- **RLS habilitada em toda tabela desde a criação.** Nunca criar tabela no Supabase sem policy — nem "temporariamente pra testar". Uma tabela sem RLS com Supabase Auth ativo é aberta pra qualquer usuário autenticado.
- **RBAC nas três roles (aluno/professor/school_admin)** aplicado via RLS — não existe backend próprio pra validar de novo, então a policy é a única linha de defesa real. Não confie em esconder botão no frontend como controle de acesso.
- **Prevenção de IDOR é responsabilidade da policy RLS.** Toda policy que recebe um ID (session_id, activity_id, student_id) via subquery deve checar que `auth.uid()` tem relação legítima com aquele recurso (ex.: `session_id in (select id from sessions where teacher_id = auth.uid())`) — nunca uma policy que libere leitura/escrita só por "a linha existe".
- **Chave de API de IA nunca no frontend.** Fica em um secret da Edge Function `tutor-restrito` (`supabase secrets set`), lido via `Deno.env.get(...)` dentro da function. Frontend só chama `supabase.functions.invoke('tutor-restrito', ...)` — nunca vê a chave, nunca chama o provedor de IA direto.
- **Service role key do Supabase nunca no frontend/Vite** (`VITE_*` é exposto no bundle). Frontend usa só a anon key + RLS. Se uma agregação legítima precisar cruzar RLS (ex.: visão da escola), a saída é uma view/função `SECURITY DEFINER`-like que já embute o filtro de segurança na própria query (ver princípio de dados acima) — não expor a service role key em lugar nenhum do client.
- **LGPD:** dado de humor/foco é dado sensível de criança/adolescente. Ao adicionar qualquer novo campo de coleta, perguntar: isso precisa ser identificável, ou dá pra agregar/anonimizar? Preferir agregação sempre que a feature permitir (ver princípio de dados acima).

## Convenções de código

- **React:** componentes funcionais, TypeScript estrito (proibido `any`), Tailwind para estilo — sem CSS solto. Hooks (`web/src/hooks`) fazem toda a leitura/escrita no Supabase; componentes (`web/src/components`) são presentacionais, recebem dado e callbacks via props — hook mora na página (`web/src/pages`), não dentro do componente, salvo exceção documentada (ex.: um widget autocontido tipo `ChatTutor` que não deve acoplar sua própria chamada de IA ao contrato de props do componente pai).
- **Realtime:** Supabase Realtime `postgres_changes`, filtrado por `session_id`/`student_id` conforme a policy RLS permitir — é o mesmo mecanismo usado pro painel ao vivo do professor, pro aluno saber quando uma atividade nova foi lançada, e é o que vai alimentar os gatilhos de conteúdo (professor → aluno).
- **Migrations:** SQL puro em `supabase/migrations/`, aplicadas via `npx supabase db query --db-url "$DATABASE_URL" --file <path>` (projeto usa Supabase Cloud, não Docker local — `db push`/`db reset` têm bug confirmado com senha percent-encoded). Arquivo com mais de um statement precisa ser aplicado em partes separadas — o CLI rejeita multi-statement em um único `--file`.
- **Nomenclatura em inglês no schema** (`sessions`, `student_events`, `domain_progress`) é o que já está implementado e testado — manter consistência com o schema real, não com o rascunho em português do `produto.md` (que ficou desatualizado nesse ponto; ver a nota na própria seção "Modelo de dados" de lá).

## O que NÃO fazer, mesmo se parecer mais rápido

- Não guardar a service role key do Supabase em variável de ambiente do frontend/Vite (`VITE_*` é exposto no bundle).
- Não criar policy/view que devolva lista de alunos com nome + métrica individual de foco/erro pro professor ou escola — viola o princípio de dados.
- Não implementar qualquer forma de "streak" ou penalidade por não usar o app em determinado dia — contradiz a regra de saída graciosa.
- Não pular RLS "só pra essa tabela de teste" — vira dívida técnica que ninguém lembra de arrumar antes da demo.
- Não subir um backend próprio (Go ou qualquer outro) pra "resolver" algo que RLS ou uma Edge Function já resolvem — decisão já tomada, ver "Por que Supabase aqui" acima.

## Escopo do MVP (12h) — não expandir sem necessidade

Dentro do prazo: Modo Aula + Acompanhamento de Aula (sessão + QR + configuração por toggles + painel do professor + humor agregado + gatilhos de conteúdo em tempo real com legenda de acessibilidade + botão "não entendi" acionando o tutor contextualizado + botão de dúvida agregado), Intercepta (missão fora da escola, absorve o que seria "Desafios"), Tutor restrito, Check-in de humor + Raio-X (pode usar dado pré-populado pra demo), Trilha de Domínio simples, medidor coletivo simples.

Fora do MVP, não implementar sem alinhar antes: bloqueio nativo de outros apps / modo silencioso de sistema (exige Accessibility Service, é app nativo — fora de escopo de PWA), painel completo de controle parental, geração automática de missão via IA a partir de resumo do professor, suporte a Fundamental 1, importação/geração de slides, gestão de notas e faltas, fluxo de laboratório com registro fotográfico, desafios em formato livre de vídeo/arquivo, adaptação de conteúdo baseada em histórico de notas/desempenho (o "não entendi" sob demanda cobre a mesma necessidade), transcrição automática de voz (só se testada e confiável no aparelho da demo — Web Speech API é inconsistente em Safari/iOS).