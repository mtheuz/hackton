# AGENTS.md — Diretrizes para Agentes de IA e Desenvolvedores

> **Projeto**: Fokido  
> **Descrição**: Plataforma web de aprendizagem ativa em sala de aula (Modo Aula) e reconversão de impulsos digitais fora da escola (Intercepta), com Tutor Restrito com IA e Raio-X socioemocional privado.  
> **Stack Principal**: Go (Backend API) | React + TypeScript (Frontend Web/PWA) | Supabase (Database PostgreSQL, Auth, Realtime & RLS)

---

## 1. Visão Geral e Propósito do Produto

O **Fokido** é uma plataforma educacional web desenhada para resolver simultaneamente os desafios regulatórios do celular em sala de aula (**Lei 15.100**, **Decreto 12.385**) e os desafios biológicos e comportamentais da distração digital fora da escola.

### Os Três Atores e a Regra do Fio Condutor
- **Aluno**: O celular vira ferramenta de aprendizagem ativa na aula. Fora da escola, recebe missões de 3 a 5 minutos nos momentos de impulso hábito-rede social. Recebe um **Raio-X privado** de desempenho e humor.
- **Professor**: Conduz o **Modo Aula** (quizzes colaborativos, enquetes, perguntas abertas) em tempo real, enxergando engajamento e pontos de trava da turma sem burocracia.
- **Escola**: Cumpre exigências legais de uso pedagógico autorizado e visualiza **sinais agregados e anonimizados** de bem-estar e engajamento da turma ao longo do tempo.

> **Princípio da Tabela Única de Eventos**: Um único evento de interações/check-in alimenta três visões distintas por meio de filtros e visões seguras:
> 1. `Visão Aluno`: Privada, individual, restrita ao próprio usuário.
> 2. `Visão Professor`: Agregada em tempo real por sessão/sala de aula.
> 3. `Visão Escola`: Agregada e anonimizada por turma/período histórico.

---

## 2. Fundamentação Científica & Conformidade Normativa

Ao implementar recursos no backend (Go) ou frontend (React), os Agentes de IA e desenvolvedores DEVEM respeitar as seguintes premissas:

### A. Gestão de Dopamina e Neurociência do Hábito
- **Tamanho Percebido da Tarefa vs. Energia de Realização**: O cérebro economiza energia biológica. As missões do *Intercepta* devem ter duração de **3 a 5 minutos** (tarefas percebidas como pequenas) para diminuir o atrito e quebrar a inércia em momentos de baixa força de vontade.
- **Métricas Não-Aditivas**: O sistema **NUNCA** deve exibir métricas baseadas em "tempo logado" ou "tempo de tela", pois induzem ao vício digital. O placar deve registrar estritamente **"Trocas de impulso por estudo"** (vitórias comportamentais).

### B. Diretrizes de IA na Educação (MEC 2026) & ECA Digital
- **Centralidade do Educador (Human-in-the-Loop)**: A tecnologia é ferramenta de apoio à mediação docente. O *Modo Aula* depende da abertura e condução do professor.
- **Tutor Restrito (Metacognição e Aprendizagem Ativa)**: O tutor de IA **NUNCA** deve entregar a resposta pronta ao aluno. A IA deve usar questionamento socrático (scaffolding) para estimular a autorregulação e a autoria intelectual.


---

## 3. Arquitetura e Stack Tecnológica

### Stack Overview
```text
[ React (Vite + TS + Tailwind) ] <---> [ Supabase Realtime / Client ]
             |
             +---> [ Go (REST API / Middleware JWT) ] ---> [ Supabase PostgreSQL DB ]
                                                                ^
                                                                | (RLS Policies)
```

### Stack Detail
- **Frontend (`/web`)**: React 18+, TypeScript, Vite, Tailwind CSS, TanStack Query (React Query) para cache/fetches, Zustand para gerenciamento de estado global leve, `@supabase/supabase-js`.
- **Backend (`/api`)**: Go 1.22+, `chi` router (ou `gin`), arquitetura limpa (Handler -> Service -> Repository), middleware de autenticação validando tokens JWT do Supabase, cliente HTTP otimizado para chamadas aos LLMs (Tutor Restrito).
- **Banco de Dados & Infra (`/supabase`)**: Supabase PostgreSQL, Migrations gerenciadas via Supabase CLI, Row Level Security (RLS) estrito para garantia de isolamento de dados por papel (`student`, `teacher`, `school_admin`).

---

## 4. Estrutura do Repositório

```directory
/fokido
├── api/                   # Backend em Go
│   ├── cmd/
│   │   └── server/        # Ponto de entrada (main.go)
│   ├── internal/
│   │   ├── config/        # Variáveis de ambiente e secrets
│   │   ├── handler/       # Handlers HTTP REST
│   │   ├── middleware/    # Auth Supabase JWT, CORS, Rate Limit, Logging
│   │   ├── model/         # Structs de domínio e DTOs
│   │   ├── repository/    # Acesso a banco / Supabase Postgres Client
│   │   └── service/       # Regras de negócio (Sessão Aula, Intercepta, Tutor Prompt)
│   ├── pkg/               # Bibliotecas reutilizáveis (logger, httpclient)
│   ├── go.mod
│   └── go.sum
├── web/                   # Frontend React (Mobile-First SPA/PWA)
│   ├── src/
│   │   ├── assets/        # Ícones e imagens
│   │   ├── components/    # UI components (ModoAula, InterceptaCard, ChatTutor, CheckinHumor)
│   │   ├── hooks/         # Custom hooks (useRealtimeSession, useAuth, useCheckin)
│   │   ├── pages/         # Páginas por ator (/aluno, /professor, /escola)
│   │   ├── services/      # Cliente HTTP (Go API) e Supabase Client
│   │   ├── store/         # Zustand stores (useUserStore, useSessionStore)
│   │   ├── types/         # Definições TypeScript
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── supabase/              # Schema, Migrations e RLS
    ├── migrations/        # Arquivos de migração SQL
    │   ├── 00001_initial_schema.sql
    │   └── 00002_rls_policies.sql
    └── config.toml
```

---

## 5. Modelagem de Dados e Segurança (Supabase RLS)

### Schema Fundamental (Exemplo)
- `users`: `id`, `email`, `role` (`student`, `teacher`, `school_admin`), `school_id`, `created_at`.
- `classes`: `id`, `school_id`, `teacher_id`, `name`, `code`.
- `sessions`: `id`, `class_id`, `teacher_id`, `code` (4 dígitos), `status` (`active`, `finished`), `created_at`.
- `activities`: `id`, `session_id`, `type` (`quiz`, `open_question`, `poll`), `content_json`.
- `student_events`: `id`, `student_id`, `session_id`, `event_type` (`checkin_humor`, `activity_answer`, `intercepta_mission`), `payload_json`, `created_at`.

### Regras de Ouro de RLS (Row Level Security)
1. **Dados de Humor / Raio-X**: O aluno pode `INSERT` e `SELECT` apenas registros onde `student_id = auth.uid()`. NENHUM professor ou escola pode ler linhas individuais de `student_events` onde `event_type = 'checkin_humor'`.
2. **Dados do Professor**: O professor acessa visões agregadas em tempo real (`VIEW session_live_stats`) calculadas via `COUNT` / `AVG` sem expor respostas sensíveis individuais quando anonimizadas.
3. **Dados da Escola**: Consultas para a visão da escola DEVEM utilizar `GROUP BY class_id, date` com contagem mínima por lote (k-anonimato) para evitar reidentificação.

---

## 6. Diretrizes para Agentes de Código (Prompting & Coding Rules)

Quando um Agente de IA estiver gerando código neste repositório, DEVE seguir estas diretrizes:

### A. Regras para Backend (Go)
- Use contexto explicitamente: `ctx context.Context` em todas as assinaturas de service e repository.
- Tratamento rigoroso de erros: Nunca ignorar erros com `_`. Retornar respostas JSON padronizadas: `{"error": "mensagem clara", "code": 400}`.
- Autenticação: Extrair `user_id` e `role` a partir das claims do JWT validado no middleware Supabase.
- Conectividade Resiliente: Tratar retentativas com backoff exponencial para ambientes de sala de aula com wi-fi instável.

### B. Regras para Frontend (React + TypeScript)
- **Mobile-First e Navegador Puro**: O aluno entra pelo navegador do celular sem instalar nada. Design deve ser totalmente responsivo (viewports de 360px a 430px para smartphones).
- **Sem Bundles Pesados**: Mantenha o tempo de carregamento inicial mínimo para funcionar bem no 3G/4G dos alunos.
- **Tipagem Estrita**: Proibido usar `any`. Defina interfaces claras em `web/src/types`.
- **Feedback Visual Imediato**: Ações do Modo Aula (enviar resposta, check-in) devem fornecer feedback tátil/visual instantâneo com estados otimistas.

### C. Regras para o Tutor Restrito (Prompt da IA)
O prompt do sistema para o serviço do Tutor Restrito em Go deve seguir este modelo rígido:
```text
Você é o Tutor Restrito do Fokido, um assistente pedagógico para estudantes do Ensino Fundamental II e Ensino Médio.
REGRAS INEGOCIÁVEIS:
1. NUNCA forneça a resposta pronta para a pergunta do aluno.
2. Responda SEMPRE com uma pergunta orientadora, uma dica conceitual ou uma decomposição do problema em etapas menores.
3. Se o aluno pedir a resposta direta, explique gentilmente que seu papel é ajudá-lo a pensar e raciocinar por conta própria.
4. Mantenha o tom encorajador, simples e focado no conteúdo da aula do dia.
```

---

## 7. Workflow de Desenvolvimento e Comandos

### Executando Localmente
- **Supabase Local**: `supabase start`
- **Backend Go**: `cd api && go run cmd/server/main.go`
- **Frontend React**: `cd web && npm run dev`

### Testes e Qualidade
- **Go Tests**: `go test -v -race ./...`
- **React Lint & Typecheck**: `npm run lint && npm run typecheck`
- **Supabase RLS Tests**: Garantir que as migrations possuem testes de políticas RLS.

---
*Documento mantido pelo time de Engenharia e Produto do Fokido. Atualizado em 2026.*
