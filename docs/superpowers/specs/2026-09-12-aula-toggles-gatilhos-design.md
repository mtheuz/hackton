# Modo Aula — Toggles de Sessão + Gatilhos de Conteúdo

Status: approved for planning
Date: 2026-09-12

## Objetivo

Duas peças do produto (`produto.md` § "Modo Aula + Acompanhamento de Aula"),
implementadas em sequência porque a segunda depende da primeira:

1. **Toggles de configuração da sessão**: formulário simples que o
   professor preenche ao iniciar a aula (permitir anotações, permitir
   chatbot livre, modo foco, quiz ao final, modo acessibilidade).
2. **Gatilhos de conteúdo**: professor envia, em tempo real, uma fórmula
   ou anotação de apoio pro celular do aluno durante a explicação. Se o
   toggle "modo acessibilidade" da sessão estiver ligado, o professor pode
   (opcionalmente) anexar uma legenda ao gatilho.

Escopo desta iteração: só `formula` e `note` como tipos de gatilho —
`imagem` fica pra depois (precisaria de upload/Storage ou pelo menos URL,
não decidido ainda). Só `accessibility_mode` tem efeito funcional agora —
os outros 4 toggles ficam persistidos na sessão, sem feature própria
construída ainda (ninguém implementou anotação do aluno, chatbot livre,
modo foco ou quiz final).

## Dados

### `sessions` ganha 5 colunas

```sql
alter table sessions
  add column allow_notes boolean not null default false,
  add column allow_free_chatbot boolean not null default false,
  add column focus_mode boolean not null default false,
  add column quiz_at_end boolean not null default false,
  add column accessibility_mode boolean not null default false;
```

### Tabela nova `content_triggers`

```sql
create table content_triggers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  type text not null check (type in ('formula', 'note')),
  content text not null,
  accessibility_caption text,
  created_at timestamptz not null default now()
);

alter table content_triggers enable row level security;

create policy content_triggers_insert_own_session on content_triggers
  for insert with check (session_id in (select id from sessions where teacher_id = auth.uid()));

create policy content_triggers_select_authenticated on content_triggers
  for select using (auth.role() = 'authenticated');
```

`type` como `text` + `check` (não `enum`) de propósito — mais fácil de
estender pra `'image'` depois sem `ALTER TYPE`. `select` liberado pra
qualquer autenticado, mesmo padrão já usado em `activities`/`sessions`
(00003_rls_policies.sql) — material pedagógico, não dado sensível de
aluno; a regra de ouro de privacidade (CLAUDE.md) é sobre `student_events`
individual, não sobre conteúdo que o professor decide compartilhar com a
turma inteira.

## Professor (`ModoAulaProfessor`)

- **Tela sem sessão ativa**: 5 checkboxes (rótulos: "Permitir anotações",
  "Permitir chatbot livre", "Modo foco", "Quiz ao final", "Modo
  acessibilidade") acima do botão de iniciar turma. Estado local do
  formulário; ao clicar "Iniciar Modo Aula · <turma>", passa
  `{ classId, config }` pro `onStartSession`.
- **Sessão ativa**: nova seção "Enviar gatilho" ao lado do lançador de
  atividade — seletor de tipo (fórmula/anotação), textarea de conteúdo, e
  campo de legenda que só renderiza se `session.config.accessibilityMode`
  for `true`. Botão "Enviar gatilho" chama `onSendContentTrigger(type,
  content, caption)`.

## Aluno (`ModoAulaAluno`)

- Novo card destacado (estilo diferenciado — accent, não o mesmo cinza
  neutro dos outros cards) mostrando o `contentTrigger` mais recente
  (conteúdo + legenda se houver). Aparece em qualquer estado depois de
  entrar na sessão (aguardando atividade / respondendo / já respondeu) —
  não aparece na tela de "entrar com código". Some quando `session.status`
  vira `finished` (junto com o resto da UI de sessão). Sem histórico —
  só o mais recente, substituído via Realtime quando chega um novo.

## Hooks

- `useTeacherSession`:
  - `startSession(classId: string, config: SessionConfig)` — inclui as 5
    colunas no insert.
  - `session: LiveSession` ganha `config: SessionConfig`.
  - novo `sendContentTrigger(type: ContentTriggerType, content: string,
    accessibilityCaption?: string): Promise<void>` — insere em
    `content_triggers` usando `session.id`.
- `useLiveSession`:
  - novo `contentTrigger: ContentTrigger | null` no retorno — busca o mais
    recente da sessão ao entrar/mudar de sessão, atualizado via o mesmo
    canal Realtime que já existe (mais um `.on('postgres_changes', {table:
    'content_triggers', ...})` no canal `student-live-session-<id>`).

## Tipos novos (`web/src/types/modoAula.ts`)

```ts
export interface SessionConfig {
  allowNotes: boolean;
  allowFreeChatbot: boolean;
  focusMode: boolean;
  quizAtEnd: boolean;
  accessibilityMode: boolean;
}

export type ContentTriggerType = 'formula' | 'note';

export interface ContentTrigger {
  id: string;
  type: ContentTriggerType;
  content: string;
  accessibilityCaption: string | null;
}
```

`LiveSession` ganha o campo `config: SessionConfig`.

## Testes

- `useTeacherSession`: teste de `startSession` atualizado pra passar
  `config` e verificar que o insert inclui as 5 colunas; novo teste pra
  `sendContentTrigger`.
- `useLiveSession`: novo teste verificando que `contentTrigger` é
  carregado a partir de `content_triggers`.
- `ModoAulaProfessor`: novo teste pros checkboxes (config chega correta no
  `onStartSession`) e pro envio de gatilho (campo de legenda só aparece
  com `accessibilityMode: true`).
- `ModoAulaAluno`: novo teste renderizando o `contentTrigger`.

## Fora de escopo

- Tipo de gatilho `imagem` (upload ou URL — decisão adiada).
- Qualquer comportamento real dos toggles `allow_notes`,
  `allow_free_chatbot`, `focus_mode`, `quiz_at_end` — só persistência.
- Histórico de gatilhos (só o mais recente é mostrado).
