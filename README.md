# Tokido

Plataforma gamificada e educacional que ensina o aluno a usar o celular como ferramenta de estudo dentro da sala de aula, guiado pelo professor, e fora dela.

Construída pra um hackathon de 12h sobre **uso consciente de smartphones nas escolas**, com base em dois marcos legais brasileiros:

- **Lei 15.100/2025** — restringe uso de celular em aula/recreio, exceto uso pedagógico autorizado pelo professor.
- **Decreto 12.385/2025** — obriga a escola a ter estratégia de identificação de sofrimento psíquico do aluno.

O produto existe pra atender as duas obrigações ao mesmo tempo, não pra contorná-las.

## Credenciais de teste

Seed de demo (`supabase/migrations/00004_seed_demo.sql`) já cria contas prontas.

| Papel | Nome | Email | Senha |
|---|---|---|---|
| Professor | João Ferreira | `professor@demo.foco` | `demo1234` |
| Aluno | Maria Souza | `aluno1@demo.foco` | `demo1234` |

Turma já vinculada ao professor: **Turma Demo**, código `TURMA1`. Só valem se essa migration tiver sido aplicada no projeto Supabase que o `.env` aponta.

## Os três papéis

| Papel | Rota | O que faz |
|---|---|---|
| **Aluno** | `/aluno` | Entra em aula por código/QR, responde atividades, recebe gatilhos de conteúdo em tempo real, joga os Desafios fora da escola, conversa com o tutor restrito e acompanha seu Raio-X privado (humor × desempenho). |
| **Professor** | `/professor` | Abre sessão de aula, configura por toggles, acompanha painel ao vivo (engajamento, dúvidas, domínio da turma, humor agregado), dispara gatilhos de conteúdo e gerencia disciplinas/aulas. |
| **Escola** | `/escola` | Vê sinais agregados e anonimizados de bem-estar e engajamento da rede — nunca por aluno, nunca por turma isolada. |

Login e RBAC são resolvidos inteiramente pelo Supabase Auth + Row Level Security (`web/src/components/RequireRole.tsx` só decide qual rota renderizar — a policy do banco é a única barreira real).

## Fluxo geral

```mermaid
flowchart TD
    Login([Login]) --> Role{Papel}

    Role -->|Aluno| CheckIn[Check-in de humor do dia]
    CheckIn --> Contexto{Onde está}
    Contexto -->|Em aula| Aula[Acompanhamento de Aula:<br/>recebe gatilho de conteúdo,<br/>"não entendi", "dúvida"]
    Contexto -->|Fora da escola| Desafio[Notificação no horário de risco<br/>→ missão de 3–5 min]
    Aula --> Tutor[Tutor restrito<br/>pergunta-guia, nunca resposta pronta]
    Desafio --> Tutor
    Aula --> Ganho1[+PF · Domínio]
    Desafio --> Ganho2[+PF em dobro]
    Ganho1 --> RaioX[Raio-X privado<br/>humor × foco]
    Ganho2 --> RaioX

    Role -->|Professor| Config[Configura sessão por toggles]
    Config --> Inicia[Inicia sessão:<br/>código + QR + humor agregado]
    Inicia --> Painel[Painel ao vivo:<br/>engajamento, dúvidas, domínio da turma]
    Painel --> Gatilho[Dispara gatilho de conteúdo]
    Gatilho -.-> Aula
    Painel --> Encerra[Encerra sessão<br/>resumo sem nomes]

    Role -->|Escola| Rede[Painel da rede:<br/>sinais agregados, k-anonimato]

    Ganho1 -. student_events .-> Rede
    Ganho2 -. student_events .-> Rede
    Painel -. student_events .-> Rede
```

Um único evento (`student_events`) alimenta as três pontas — cada papel só enxerga o corte que a policy RLS libera pra ele (ver [O princípio de dados](#o-princípio-de-dados)).

## Stack

Sem backend próprio — decisão travada durante a implementação (ver `docs/superpowers/plans/2026-09-11-fundacao.md`).

- **Front-end:** React 19 + TypeScript + Vite + Tailwind CSS, falando direto com o Supabase via `@supabase/supabase-js` (sem camada HTTP própria).
- **Banco / Auth / Realtime / RBAC:** Supabase (Postgres + Row Level Security + Supabase Auth + Realtime `postgres_changes`). RLS é o único ponto de controle de acesso.
- **Tutor de IA:** Edge Function `supabase/functions/tutor-restrito` (Deno), chamada via `supabase.functions.invoke(...)`. Roda com o JWT do próprio aluno (nunca service role); a chave do provedor de IA fica só no secret da function. Modelo padrão: `claude-haiku-4-5-20251001` (sobrescrevível pela env var `TUTOR_MODEL`).

## Estrutura do repositório

```
web/                      front-end (React + Vite)
  src/pages/               LoginPage, AlunoHome, ProfessorHome, EscolaHome
  src/hooks/                toda leitura/escrita no Supabase vive aqui
  src/components/           componentes apresentacionais (recebem dado + callbacks via props)
  src/lib/                  utilidades puras (arquivos de conteúdo, slides pptx, etc.)
supabase/
  migrations/               SQL puro, aplicado em ordem — schema, RLS, seeds, agregações
  functions/tutor-restrito/ Edge Function do tutor de IA
  functions/_shared/        CORS compartilhado
  tests/rls_isolation_test.sql   teste de isolamento de RLS entre papéis
docs/                       specs e planos de implementação (superpowers)
CLAUDE.md                   guia de contexto pro agente de código
produto.md                  definição de produto completa (fluxo de telas, modelo de dados)
DESIGN.md / docs/brand-guidelines.md   sistema de design da interface
```

## Rodando localmente

Pré-requisitos: Node 22+, um projeto Supabase (cloud — o CLI local com `db push`/`db reset` tem bug confirmado com senha percent-encoded neste projeto).

```bash
cd web
npm install
cp .env.example .env   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Aplicar as migrations (uma de cada vez — o CLI rejeita multi-statement num único `--file`):

```bash
npx supabase db query --db-url "$DATABASE_URL" --file supabase/migrations/00001_initial_schema.sql
# repetir em ordem pros demais arquivos de supabase/migrations/
```

Configurar o secret da IA do tutor (nunca em `.env`/`VITE_*` — vazaria no bundle):

```bash
supabase secrets set ANTHROPIC_API_KEY=...
```

### Scripts (`web/`)

| Comando | Faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | typecheck (`tsc -b`) + build de produção |
| `npm run lint` | Oxlint |
| `npm test` | suíte de testes (Vitest + Testing Library) |
| `npm run preview` | serve o build de produção localmente |

## O princípio de dados

Toda ação do aluno (entrar/sair de sessão, responder atividade, completar missão, check-in de humor) grava uma linha em `student_events`. Não existem tabelas separadas por papel — existem **políticas RLS diferentes** sobre a mesma tabela:

- **Aluno** vê só o próprio dado (`student_id = auth.uid()`).
- **Professor** vê agregado por sessão — nunca sabe quem especificamente errou ou saiu, e nunca acessa `checkin_humor` individual.
- **Escola** vê agregado por turma ao longo do tempo, com k-anonimato (mínimo de alunos distintos por grupo) — nunca por aluno, nunca por sessão.

Essa é a defesa de privacidade do produto — arquitetura, não promessa verbal. Detalhes das policies em `supabase/migrations/` e no princípio descrito em `CLAUDE.md`.

## Créditos

Serviços:

- **[Supabase](https://supabase.com)** — Postgres, Auth, Row Level Security, Realtime e Edge Functions. Infraestrutura inteira do produto.
- **[Anthropic Claude](https://www.anthropic.com)** (`claude-haiku-4-5`) — modelo por trás do tutor restrito.

Bibliotecas (`web/`), runtime:

| Pacote | Uso no projeto |
|---|---|
| [react](https://react.dev) / [react-dom](https://react.dev) | UI |
| [react-router-dom](https://reactrouter.com) | roteamento entre `/aluno`, `/professor`, `/escola` |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) | cliente do Supabase (banco, auth, realtime, edge functions) |
| [zustand](https://zustand-demo.pmnd.rs) | estado global de autenticação |
| [@tanstack/react-query](https://tanstack.com/query) | cache e data-fetching |
| [recharts](https://recharts.org) | gráficos (humor da turma, Raio-X, domínio) |
| [qrcode.react](https://github.com/zpao/qrcode.react) | QR code de entrada na sessão de aula |
| [jsqr](https://github.com/cozmo/jsQR) | leitura de QR code pela câmera |
| [html2canvas](https://html2canvas.hertzen.com) | captura de tela pra export/preview |
| [pptx-preview](https://github.com/lyy2004/pptx-preview) | preview de slides `.pptx` dentro do app |

Bibliotecas, desenvolvimento/build:

| Pacote | Uso no projeto |
|---|---|
| [vite](https://vite.dev) + [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | bundler e servidor de dev |
| [typescript](https://www.typescriptlang.org) | tipagem estática |
| [tailwindcss](https://tailwindcss.com) + [postcss](https://postcss.org) + [autoprefixer](https://github.com/postcss/autoprefixer) | estilo |
| [vitest](https://vitest.dev) + [@testing-library/react](https://testing-library.com/react) + [jsdom](https://github.com/jsdom/jsdom) | testes |
| [oxlint](https://oxc.rs) | lint |
| [unplugin-icons](https://github.com/unplugin/unplugin-icons) + conjuntos [Iconify](https://iconify.design) (`streamline-emojis`, `streamline-ultimate-color`, `twemoji`) | ícones |
| [@svgr/core](https://react-svgr.com) | importar SVG como componente React |

## Documentação

- [`CLAUDE.md`](./CLAUDE.md) — guia de contexto, convenções e regras de negócio invioláveis.
- [`produto.md`](./produto.md) — definição de produto completa: as cinco peças do MVP, fluxo de telas de cada ator, modelo de dados de referência.
- [`DESIGN.md`](./DESIGN.md) e [`docs/brand-guidelines.md`](./docs/brand-guidelines.md) — sistema de design da interface.
