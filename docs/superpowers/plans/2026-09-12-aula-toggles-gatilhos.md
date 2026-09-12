# Modo Aula — Toggles de Sessão + Gatilhos de Conteúdo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the teacher configure a session with 5 toggles at start time,
and send real-time "content triggers" (formula/note) to students during
class — with an optional accessibility caption gated by the session's
`accessibility_mode` toggle.

**Architecture:** Same direct-to-Supabase pattern as the rest of Modo
Aula. `sessions` gains 5 boolean columns; a new `content_triggers` table
holds teacher-sent material, RLS-scoped to the owning session for writes,
readable by any authenticated user for reads (same precedent as
`activities`/`sessions`). `useTeacherSession` gains `sessionConfig` (kept
separate from the shared `LiveSession` type — only the teacher needs it)
and `sendContentTrigger`; `useLiveSession` gains `contentTrigger`, updated
via the same Realtime channel already subscribed for activities/session
status.

**Tech Stack:** React 19, TypeScript, `@supabase/supabase-js`, Vitest +
Testing Library, Tailwind (existing tokens).

**Spec:** `docs/superpowers/specs/2026-09-12-aula-toggles-gatilhos-design.md`

## Global Constraints

- Only `formula` and `note` trigger types now — no `image` (spec "Fora de
  escopo").
- Only `accessibility_mode` has real downstream behavior (gates the
  caption field). The other 4 toggles (`allow_notes`,
  `allow_free_chatbot`, `focus_mode`, `quiz_at_end`) are persisted only —
  no feature consumes them yet. Do not build fake behavior for them.
- `LiveSession` (`web/src/types/modoAula.ts`, existing) does **not**
  change — `sessionConfig` is a separate return value from
  `useTeacherSession`, never nested inside `session`. This keeps
  `useLiveSession`/`ModoAulaAluno`/their tests untouched by the config
  toggles work (spec "Hooks" note).
- `content_triggers` RLS: insert restricted to the owning session's
  teacher; select open to any authenticated user (same precedent as
  `activities_select_authenticated`/`sessions_select_authenticated` in
  `00003_rls_policies.sql` — pedagogical material, not sensitive student
  data).
- Supabase Cloud target: apply migrations with `npx supabase db query
  --db-url "$DATABASE_URL" --file <path>`, reading `DATABASE_URL` from
  the repo's `.env`. A file with more than one SQL statement must be
  split into separate single-statement files before applying — the CLI
  rejects multi-statement files.
- Tipagem estrita: no `any`.

---

## Task 1: Migration — session config columns + `content_triggers` table

**Files:**
- Create: `supabase/migrations/00010_session_config_and_content_triggers.sql`

**Interfaces:**
- Consumes: `sessions` table (existing).
- Produces: 5 new boolean columns on `sessions`
  (`allow_notes`, `allow_free_chatbot`, `focus_mode`, `quiz_at_end`,
  `accessibility_mode`, all `not null default false`); table
  `content_triggers(id, session_id, type, content, accessibility_caption,
  created_at)` with RLS — every later task in this plan depends on both.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00010_session_config_and_content_triggers.sql
alter table sessions
  add column allow_notes boolean not null default false,
  add column allow_free_chatbot boolean not null default false,
  add column focus_mode boolean not null default false,
  add column quiz_at_end boolean not null default false,
  add column accessibility_mode boolean not null default false;

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

- [ ] **Step 2: Apply to Supabase Cloud (split into single statements)**

```bash
mkdir -p /tmp/aula-toggles-migration
cat > /tmp/aula-toggles-migration/01_sessions_columns.sql <<'EOF'
alter table sessions
  add column allow_notes boolean not null default false,
  add column allow_free_chatbot boolean not null default false,
  add column focus_mode boolean not null default false,
  add column quiz_at_end boolean not null default false,
  add column accessibility_mode boolean not null default false;
EOF
cat > /tmp/aula-toggles-migration/02_create_table.sql <<'EOF'
create table content_triggers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id),
  type text not null check (type in ('formula', 'note')),
  content text not null,
  accessibility_caption text,
  created_at timestamptz not null default now()
);
EOF
cat > /tmp/aula-toggles-migration/03_enable_rls.sql <<'EOF'
alter table content_triggers enable row level security;
EOF
cat > /tmp/aula-toggles-migration/04_insert_policy.sql <<'EOF'
create policy content_triggers_insert_own_session on content_triggers
  for insert with check (session_id in (select id from sessions where teacher_id = auth.uid()));
EOF
cat > /tmp/aula-toggles-migration/05_select_policy.sql <<'EOF'
create policy content_triggers_select_authenticated on content_triggers
  for select using (auth.role() = 'authenticated');
EOF

for f in 01_sessions_columns.sql 02_create_table.sql 03_enable_rls.sql 04_insert_policy.sql 05_select_policy.sql; do
  npx supabase db query --db-url "$DATABASE_URL" --file /tmp/aula-toggles-migration/$f
done
```
Expected: `ALTER TABLE`, `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY`,
`CREATE POLICY` — no errors.

- [ ] **Step 3: Verify**

Run: `npx supabase db query --db-url "$DATABASE_URL" "select column_name from information_schema.columns where table_name = 'sessions' and column_name like '%mode' or column_name like 'allow_%' or column_name = 'quiz_at_end'"`
Expected: the 5 new column names.

Run: `npx supabase db query --db-url "$DATABASE_URL" "select policyname from pg_policies where tablename = 'content_triggers'"`
Expected: `content_triggers_insert_own_session`,
`content_triggers_select_authenticated`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00010_session_config_and_content_triggers.sql
git commit -m "feat: add session config toggles and content_triggers table"
```

---

## Task 2: Types

**Files:**
- Modify: `web/src/types/modoAula.ts`

**Interfaces:**
- Produces (for Tasks 3-8): `SessionConfig { allowNotes: boolean;
  allowFreeChatbot: boolean; focusMode: boolean; quizAtEnd: boolean;
  accessibilityMode: boolean }`; `ContentTriggerType = 'formula' |
  'note'`; `ContentTrigger { id: string; type: ContentTriggerType;
  content: string; accessibilityCaption: string | null }`.

- [ ] **Step 1: Add the types**

Append to `web/src/types/modoAula.ts`:

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

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors (nothing consumes these types yet, so this just
confirms the file itself is valid).

- [ ] **Step 3: Commit**

```bash
git add web/src/types/modoAula.ts
git commit -m "feat: add SessionConfig and ContentTrigger types"
```

---

## Task 3: `useTeacherSession` — config + `sendContentTrigger`

**Files:**
- Modify: `web/src/hooks/useTeacherSession.ts`
- Modify: `web/src/hooks/useTeacherSession.test.ts`

**Interfaces:**
- Consumes: `SessionConfig`, `ContentTriggerType` from Task 2.
- Produces (for Tasks 5, 7): `startSession(classId: string, config:
  SessionConfig): Promise<void>` (signature change — was
  `(classId: string) => Promise<void>`); new return field
  `sessionConfig: SessionConfig | null`; new `sendContentTrigger(type:
  ContentTriggerType, content: string, accessibilityCaption?: string):
  Promise<void>`.

- [ ] **Step 1: Update the test file**

Replace `web/src/hooks/useTeacherSession.test.ts` entirely:

```ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTeacherSession } from './useTeacherSession';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const classesBuilder = chainable({ data: [{ id: 'class-1', name: 'Turma Demo' }], error: null });
const sessionsBuilder = chainable({
  data: [
    {
      id: 'session-1',
      code: '1234',
      status: 'active',
      allow_notes: false,
      allow_free_chatbot: false,
      focus_mode: false,
      quiz_at_end: false,
      accessibility_mode: true,
    },
  ],
  error: null,
});
const activitiesBuilder = chainable({
  data: [
    {
      id: 'activity-1',
      type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    },
  ],
  error: null,
});
const contentTriggersBuilder = chainable({ data: null, error: null });

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'classes':
      return classesBuilder;
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
    case 'content_triggers':
      return contentTriggersBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

const NO_CONFIG = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

describe('useTeacherSession', () => {
  it('starts a session with a 4-digit code and the chosen config', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startSession('class-1', { ...NO_CONFIG, accessibilityMode: true });
    });

    expect(sessionsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        class_id: 'class-1',
        teacher_id: 'teacher-1',
        status: 'active',
        allow_notes: false,
        allow_free_chatbot: false,
        focus_mode: false,
        quiz_at_end: false,
        accessibility_mode: true,
      }),
    );
    const insertedPayload = (sessionsBuilder.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as { code: string };
    expect(insertedPayload.code).toMatch(/^\d{4}$/);
  });

  it('launches an activity and exposes it as the current one', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.launchActivity('quiz', { question: 'Q?', options: ['A', 'B'], correct_index: 0 });
    });

    expect(activitiesBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      type: 'quiz',
      content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    });
    expect(result.current.activity).toEqual({
      id: 'activity-1',
      type: 'quiz',
      content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
    });
  });

  it('exposes the session config loaded from the active session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.sessionConfig).toEqual({ ...NO_CONFIG, accessibilityMode: true }));
  });

  it('sends a content trigger for the current session', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.session?.id).toBe('session-1'));

    await act(async () => {
      await result.current.sendContentTrigger(
        'formula',
        'E = mc²',
        'Energia igual massa vezes velocidade da luz ao quadrado',
      );
    });

    expect(contentTriggersBuilder.insert).toHaveBeenCalledWith({
      session_id: 'session-1',
      type: 'formula',
      content: 'E = mc²',
      accessibility_caption: 'Energia igual massa vezes velocidade da luz ao quadrado',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useTeacherSession.test.ts`
Expected: FAIL — `sessionConfig`/`sendContentTrigger` undefined,
`startSession` called with the wrong arity.

- [ ] **Step 3: Update the hook**

Replace `web/src/hooks/useTeacherSession.ts` entirely:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type {
  ActivityContent,
  ActivityType,
  ContentTriggerType,
  LiveActivity,
  LiveSession,
  SessionConfig,
  TeacherClass,
} from '../types/modoAula';

interface SessionRow {
  id: string;
  code: string;
  status: 'active' | 'finished';
  allow_notes: boolean;
  allow_free_chatbot: boolean;
  focus_mode: boolean;
  quiz_at_end: boolean;
  accessibility_mode: boolean;
}

interface ActivityRow {
  id: string;
  type: ActivityType;
  content_json: ActivityContent;
}

function randomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function configFromRow(row: SessionRow): SessionConfig {
  return {
    allowNotes: row.allow_notes,
    allowFreeChatbot: row.allow_free_chatbot,
    focusMode: row.focus_mode,
    quizAtEnd: row.quiz_at_end,
    accessibilityMode: row.accessibility_mode,
  };
}

interface UseTeacherSessionResult {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  loading: boolean;
  startSession: (classId: string, config: SessionConfig) => Promise<void>;
  endSession: () => Promise<void>;
  launchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
  sendContentTrigger: (type: ContentTriggerType, content: string, accessibilityCaption?: string) => Promise<void>;
}

export function useTeacherSession(teacherId: string): UseTeacherSessionResult {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchSession = useCallback(async () => {
    if (!teacherId) {
      setSession(null);
      setSessionConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('sessions')
      .select('id, code, status, allow_notes, allow_free_chatbot, focus_mode, quiz_at_end, accessibility_mode')
      .eq('teacher_id', teacherId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as SessionRow[];
    const current = rows[0] ?? null;
    setSession(current ? { id: current.id, code: current.code, status: current.status } : null);
    setSessionConfig(current ? configFromRow(current) : null);
    setLoading(false);
  }, [teacherId]);

  const refetchActivity = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ActivityRow[];
    const latest = rows[0] ?? null;
    setActivity(latest ? { id: latest.id, type: latest.type, content: latest.content_json } : null);
  }, []);

  useEffect(() => {
    if (!teacherId) return;
    (async () => {
      const { data } = await supabase.from('classes').select('id, name').eq('teacher_id', teacherId);
      setClasses((data ?? []) as TeacherClass[]);
    })();
  }, [teacherId]);

  useEffect(() => {
    void refetchSession();
  }, [refetchSession]);

  useEffect(() => {
    if (!session) {
      setActivity(null);
      return;
    }
    void refetchActivity(session.id);

    const channel = supabase
      .channel(`teacher-activities-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `session_id=eq.${session.id}` },
        () => void refetchActivity(session.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, refetchActivity]);

  const startSession = useCallback(
    async (classId: string, config: SessionConfig) => {
      let code = randomCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: taken } = await supabase
          .from('sessions')
          .select('id')
          .eq('code', code)
          .eq('status', 'active')
          .maybeSingle();
        if (!taken) break;
        code = randomCode();
      }

      const { error } = await supabase.from('sessions').insert({
        class_id: classId,
        teacher_id: teacherId,
        code,
        status: 'active',
        allow_notes: config.allowNotes,
        allow_free_chatbot: config.allowFreeChatbot,
        focus_mode: config.focusMode,
        quiz_at_end: config.quizAtEnd,
        accessibility_mode: config.accessibilityMode,
      });
      if (error) throw error;
      await refetchSession();
    },
    [teacherId, refetchSession],
  );

  const endSession = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) throw error;
    setSession(null);
    setSessionConfig(null);
    setActivity(null);
  }, [session]);

  const launchActivity = useCallback(
    async (type: ActivityType, content: ActivityContent) => {
      if (!session) return;
      const { error } = await supabase.from('activities').insert({
        session_id: session.id,
        type,
        content_json: content,
      });
      if (error) throw error;
      await refetchActivity(session.id);
    },
    [session, refetchActivity],
  );

  const sendContentTrigger = useCallback(
    async (type: ContentTriggerType, content: string, accessibilityCaption?: string) => {
      if (!session) return;
      const { error } = await supabase.from('content_triggers').insert({
        session_id: session.id,
        type,
        content,
        accessibility_caption: accessibilityCaption ?? null,
      });
      if (error) throw error;
    },
    [session],
  );

  return {
    classes,
    session,
    sessionConfig,
    activity,
    loading,
    startSession,
    endSession,
    launchActivity,
    sendContentTrigger,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useTeacherSession.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: FAIL at this point — `ModoAulaProfessor`/`ProfessorHome` still
call `startSession` with one argument and don't know `sessionConfig`/
`sendContentTrigger`. This is expected; Tasks 5 and 7 fix it. Confirm the
only errors are in `ModoAulaProfessor.tsx`/`ModoAulaProfessor.test.tsx`/
`ProfessorHome.tsx`, nothing else.

- [ ] **Step 6: Commit**

```bash
git add web/src/hooks/useTeacherSession.ts web/src/hooks/useTeacherSession.test.ts
git commit -m "feat: add sessionConfig and sendContentTrigger to useTeacherSession"
```

---

## Task 4: `useLiveSession` — `contentTrigger`

**Files:**
- Modify: `web/src/hooks/useLiveSession.ts`
- Modify: `web/src/hooks/useLiveSession.test.ts`

**Interfaces:**
- Consumes: `ContentTrigger`, `ContentTriggerType` from Task 2.
- Produces (for Tasks 6, 8): new return field `contentTrigger:
  ContentTrigger | null`.

- [ ] **Step 1: Update the test file**

Add a `content_triggers` case to the existing `fromMock` switch and one
new test. Edit `web/src/hooks/useLiveSession.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLiveSession } from './useLiveSession';

let sessionsResult: { data: unknown; error: unknown } = { data: null, error: null };

function chainable(getResult: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(getResult())),
    then: (resolve: (v: ReturnType<typeof getResult>) => void) => resolve(getResult()),
  };
  return builder;
}

const sessionsBuilder = chainable(() => sessionsResult);
const activitiesBuilder = chainable(() => ({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 0 } }],
  error: null,
}));
const studentEventsBuilder = chainable(() => ({ data: null, error: null }));
const contentTriggersBuilder = chainable(() => ({
  data: [{ id: 'trigger-1', type: 'formula', content: 'E=mc²', accessibility_caption: null }],
  error: null,
}));

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
    case 'student_events':
      return studentEventsBuilder;
    case 'content_triggers':
      return contentTriggersBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('useLiveSession', () => {
  beforeEach(() => {
    sessionsResult = { data: null, error: null };
    (studentEventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('reports an error when the code does not match an active session', async () => {
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('0000');
    });

    expect(result.current.session).toBeNull();
    expect(result.current.joinError).toMatch(/não encontrado/i);
  });

  it('joins the session and loads the current activity', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });

    await waitFor(() =>
      expect(result.current.activity).toEqual({
        id: 'activity-1',
        type: 'quiz',
        content: { question: 'Q?', options: ['A', 'B'], correct_index: 0 },
      }),
    );
  });

  it('submits an answer and marks the activity as answered', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });
    await waitFor(() => expect(result.current.activity).not.toBeNull());

    await act(async () => {
      await result.current.submitAnswer({ selectedIndex: 1 });
    });

    expect(studentEventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: 'session-1',
      event_type: 'activity_answer',
      payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1, text: undefined },
      pf_earned: 0,
    });
    expect(result.current.answered).toBe(true);
  });

  it('loads the most recent content trigger for the session', async () => {
    sessionsResult = { data: { id: 'session-1', code: '1234', status: 'active' }, error: null };
    const { result } = renderHook(() => useLiveSession('student-1'));

    await act(async () => {
      await result.current.join('1234');
    });

    await waitFor(() =>
      expect(result.current.contentTrigger).toEqual({
        id: 'trigger-1',
        type: 'formula',
        content: 'E=mc²',
        accessibilityCaption: null,
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify the new test fails**

Run: `cd web && npx vitest run src/hooks/useLiveSession.test.ts`
Expected: FAIL — `contentTrigger` is `undefined`.

- [ ] **Step 3: Update the hook**

Replace `web/src/hooks/useLiveSession.ts` entirely:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type {
  ActivityContent,
  ActivityType,
  ContentTrigger,
  ContentTriggerType,
  LiveActivity,
  LiveSession,
} from '../types/modoAula';

interface SessionRow {
  id: string;
  code: string;
  status: 'active' | 'finished';
}

interface ActivityRow {
  id: string;
  type: ActivityType;
  content_json: ActivityContent;
}

interface ContentTriggerRow {
  id: string;
  type: ContentTriggerType;
  content: string;
  accessibility_caption: string | null;
}

interface UseLiveSessionResult {
  session: LiveSession | null;
  activity: LiveActivity | null;
  contentTrigger: ContentTrigger | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  join: (code: string) => Promise<void>;
  submitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  leave: () => void;
}

export function useLiveSession(studentId: string): UseLiveSessionResult {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [contentTrigger, setContentTrigger] = useState<ContentTrigger | null>(null);
  const [answered, setAnswered] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const refetchActivity = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ActivityRow[];
    const latest = rows[0] ?? null;
    setActivity((current) => {
      const next = latest ? { id: latest.id, type: latest.type, content: latest.content_json } : null;
      if (next && current?.id !== next.id) setAnswered(false);
      return next;
    });
  }, []);

  const refetchContentTrigger = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('content_triggers')
      .select('id, type, content, accessibility_caption')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    const rows = (data ?? []) as ContentTriggerRow[];
    const latest = rows[0] ?? null;
    setContentTrigger(
      latest
        ? {
            id: latest.id,
            type: latest.type,
            content: latest.content,
            accessibilityCaption: latest.accessibility_caption,
          }
        : null,
    );
  }, []);

  const refetchSessionStatus = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('id, code, status')
      .eq('id', sessionId)
      .maybeSingle<SessionRow>();
    if (data) setSession({ id: data.id, code: data.code, status: data.status });
  }, []);

  useEffect(() => {
    if (!session) return;
    void refetchActivity(session.id);
    void refetchContentTrigger(session.id);

    const channel = supabase
      .channel(`student-live-session-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `session_id=eq.${session.id}` },
        () => void refetchActivity(session.id),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'content_triggers', filter: `session_id=eq.${session.id}` },
        () => void refetchContentTrigger(session.id),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        () => void refetchSessionStatus(session.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, refetchActivity, refetchContentTrigger, refetchSessionStatus]);

  const join = useCallback(async (code: string) => {
    setJoining(true);
    setJoinError(null);
    try {
      const { data } = await supabase
        .from('sessions')
        .select('id, code, status')
        .eq('code', code)
        .eq('status', 'active')
        .maybeSingle<SessionRow>();

      if (!data) {
        setJoinError('Código não encontrado. Confira com o professor.');
        return;
      }
      setSession({ id: data.id, code: data.code, status: data.status });
    } finally {
      setJoining(false);
    }
  }, []);

  const submitAnswer = useCallback(
    async (payload: { selectedIndex?: number; text?: string }) => {
      if (!session || !activity) return;
      const { error } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: session.id,
        event_type: 'activity_answer',
        payload_json: {
          activity_id: activity.id,
          type: activity.type,
          selected_index: payload.selectedIndex,
          text: payload.text,
        },
        pf_earned: 0,
      });
      if (error) throw error;
      setAnswered(true);
    },
    [session, activity, studentId],
  );

  const leave = useCallback(() => {
    setSession(null);
    setActivity(null);
    setContentTrigger(null);
    setAnswered(false);
    setJoinError(null);
  }, []);

  return { session, activity, contentTrigger, answered, joining, joinError, join, submitAnswer, leave };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useLiveSession.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useLiveSession.ts web/src/hooks/useLiveSession.test.ts
git commit -m "feat: add contentTrigger to useLiveSession"
```

---

## Task 5: `ModoAulaProfessor` — toggles form + gatilho form

**Files:**
- Modify: `web/src/components/ModoAulaProfessor.tsx`
- Modify: `web/src/components/ModoAulaProfessor.test.tsx`

**Interfaces:**
- Consumes: `SessionConfig`, `ContentTriggerType` from Task 2.
- Produces (for Task 7): props gain `sessionConfig: SessionConfig |
  null`, `onSendContentTrigger: (type: ContentTriggerType, content:
  string, accessibilityCaption?: string) => Promise<void>`;
  `onStartSession` signature changes to `(classId: string, config:
  SessionConfig) => Promise<void>`.

- [ ] **Step 1: Replace the test file**

```tsx
// web/src/components/ModoAulaProfessor.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModoAulaProfessor } from './ModoAulaProfessor';
import type { SessionConfig } from '../types/modoAula';

const NO_CONFIG: SessionConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

describe('ModoAulaProfessor', () => {
  it('lets the teacher start a session with the default config', () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[{ id: 'class-1', name: 'Turma Demo' }]}
        session={null}
        sessionConfig={null}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={onStartSession}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Iniciar Modo Aula · Turma Demo'));
    expect(onStartSession).toHaveBeenCalledWith('class-1', NO_CONFIG);
  });

  it('includes checked toggles in the session config', () => {
    const onStartSession = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[{ id: 'class-1', name: 'Turma Demo' }]}
        session={null}
        sessionConfig={null}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={onStartSession}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Modo acessibilidade'));
    fireEvent.click(screen.getByText('Iniciar Modo Aula · Turma Demo'));

    expect(onStartSession).toHaveBeenCalledWith('class-1', { ...NO_CONFIG, accessibilityMode: true });
  });

  it('launches a quiz with the filled question and options', () => {
    const onLaunchActivity = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={onLaunchActivity}
        onSendContentTrigger={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Pergunta'), { target: { value: 'Quanto é 2+2?' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 1'), { target: { value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('Opção 2'), { target: { value: 'B' } });
    fireEvent.click(screen.getByText('Lançar atividade'));

    expect(onLaunchActivity).toHaveBeenCalledWith('quiz', {
      question: 'Quanto é 2+2?',
      options: ['A', 'B'],
      correct_index: 0,
    });
  });

  it('shows the live tally for the current activity', () => {
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        sessionConfig={NO_CONFIG}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        tally={{ kind: 'options', counts: [1, 3] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={vi.fn()}
      />,
    );

    expect(screen.getByText('1 (25%)')).toBeInTheDocument();
    expect(screen.getByText('3 (75%)')).toBeInTheDocument();
  });

  it('sends a content trigger without a caption when accessibility mode is off', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        sessionConfig={NO_CONFIG}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    expect(screen.queryByLabelText('Legenda de acessibilidade')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'E = mc²' } });
    fireEvent.click(screen.getByText('Enviar gatilho'));

    expect(onSendContentTrigger).toHaveBeenCalledWith('formula', 'E = mc²', undefined);
  });

  it('sends a content trigger with a caption when accessibility mode is on', () => {
    const onSendContentTrigger = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaProfessor
        classes={[]}
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        sessionConfig={{ ...NO_CONFIG, accessibilityMode: true }}
        activity={null}
        tally={{ kind: 'options', counts: [] }}
        onStartSession={vi.fn()}
        onEndSession={vi.fn()}
        onLaunchActivity={vi.fn()}
        onSendContentTrigger={onSendContentTrigger}
      />,
    );

    fireEvent.change(screen.getByLabelText('Conteúdo'), { target: { value: 'E = mc²' } });
    fireEvent.change(screen.getByLabelText('Legenda de acessibilidade'), {
      target: { value: 'Energia igual massa vezes velocidade da luz ao quadrado' },
    });
    fireEvent.click(screen.getByText('Enviar gatilho'));

    expect(onSendContentTrigger).toHaveBeenCalledWith(
      'formula',
      'E = mc²',
      'Energia igual massa vezes velocidade da luz ao quadrado',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/ModoAulaProfessor.test.tsx`
Expected: FAIL — missing props / missing "Enviar gatilho" UI.

- [ ] **Step 3: Update the component**

Replace `web/src/components/ModoAulaProfessor.tsx` entirely:

```tsx
import { useState } from 'react';
import type {
  ActivityContent,
  ActivityType,
  AnswerTally,
  ContentTriggerType,
  LiveActivity,
  LiveSession,
  SessionConfig,
  TeacherClass,
} from '../types/modoAula';

interface ModoAulaProfessorProps {
  classes: TeacherClass[];
  session: LiveSession | null;
  sessionConfig: SessionConfig | null;
  activity: LiveActivity | null;
  tally: AnswerTally;
  onStartSession: (classId: string, config: SessionConfig) => Promise<void>;
  onEndSession: () => Promise<void>;
  onLaunchActivity: (type: ActivityType, content: ActivityContent) => Promise<void>;
  onSendContentTrigger: (type: ContentTriggerType, content: string, accessibilityCaption?: string) => Promise<void>;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

const CONFIG_TOGGLES: { key: keyof SessionConfig; label: string }[] = [
  { key: 'allowNotes', label: 'Permitir anotações' },
  { key: 'allowFreeChatbot', label: 'Permitir chatbot livre' },
  { key: 'focusMode', label: 'Modo foco' },
  { key: 'quizAtEnd', label: 'Quiz ao final' },
  { key: 'accessibilityMode', label: 'Modo acessibilidade' },
];

const DEFAULT_CONFIG: SessionConfig = {
  allowNotes: false,
  allowFreeChatbot: false,
  focusMode: false,
  quizAtEnd: false,
  accessibilityMode: false,
};

export function ModoAulaProfessor({
  classes,
  session,
  sessionConfig,
  activity,
  tally,
  onStartSession,
  onEndSession,
  onLaunchActivity,
  onSendContentTrigger,
}: ModoAulaProfessorProps) {
  const [type, setType] = useState<ActivityType>('quiz');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [showLauncher, setShowLauncher] = useState(() => !activity);
  const [startingClassId, setStartingClassId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [ending, setEnding] = useState(false);
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [triggerType, setTriggerType] = useState<ContentTriggerType>('formula');
  const [triggerContent, setTriggerContent] = useState('');
  const [triggerCaption, setTriggerCaption] = useState('');
  const [sendingTrigger, setSendingTrigger] = useState(false);

  if (!session) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-xs text-ink-500">Escolha a turma e inicie a aula.</p>

        <div className="mt-3 flex flex-col gap-2">
          {CONFIG_TOGGLES.map((toggle) => (
            <label key={toggle.key} className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={config[toggle.key]}
                onChange={(e) => setConfig({ ...config, [toggle.key]: e.target.checked })}
              />
              {toggle.label}
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {classes.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={startingClassId !== null}
              onClick={async () => {
                setStartingClassId(c.id);
                try {
                  await onStartSession(c.id, config);
                } finally {
                  setStartingClassId(null);
                }
              }}
              className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors active:bg-brand-800 disabled:opacity-50"
            >
              {startingClassId === c.id ? 'Iniciando...' : `Iniciar Modo Aula · ${c.name}`}
            </button>
          ))}
        </div>
      </section>
    );
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
      if (type === 'quiz') {
        await onLaunchActivity('quiz', { question, options: trimmedOptions, correct_index: correctIndex });
      } else if (type === 'poll') {
        await onLaunchActivity('poll', { question, options: trimmedOptions });
      } else {
        await onLaunchActivity('open_question', { question });
      }
      setQuestion('');
      setOptions(['', '']);
      setCorrectIndex(0);
      setShowLauncher(false);
    } finally {
      setLaunching(false);
    }
  }

  async function handleEndSession() {
    if (!window.confirm('Encerrar a aula agora? Os alunos serão desconectados e não vão conseguir responder mais nada.')) {
      return;
    }
    setEnding(true);
    try {
      await onEndSession();
    } finally {
      setEnding(false);
    }
  }

  async function handleSendTrigger() {
    setSendingTrigger(true);
    try {
      const caption = sessionConfig?.accessibilityMode ? triggerCaption.trim() || undefined : undefined;
      await onSendContentTrigger(triggerType, triggerContent.trim(), caption);
      setTriggerContent('');
      setTriggerCaption('');
    } finally {
      setSendingTrigger(false);
    }
  }

  const needsOptions = type === 'quiz' || type === 'poll';

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <button
          type="button"
          disabled={ending}
          onClick={() => void handleEndSession()}
          className="text-xs font-semibold text-danger-600 disabled:opacity-50"
        >
          {ending ? 'Encerrando...' : 'Encerrar aula'}
        </button>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-widest text-brand-600">{session.code}</p>
      <p className="text-xs text-ink-500">Peça pros alunos entrarem com esse código.</p>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line-200 p-4">
        <h3 className="text-xs font-semibold text-ink-700">Enviar gatilho de conteúdo</h3>
        <label htmlFor="trigger-type" className="text-xs font-semibold text-ink-700">
          Tipo
        </label>
        <select
          id="trigger-type"
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as ContentTriggerType)}
          className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
        >
          <option value="formula">Fórmula</option>
          <option value="note">Anotação</option>
        </select>
        <label htmlFor="trigger-content" className="text-xs font-semibold text-ink-700">
          Conteúdo
        </label>
        <textarea
          id="trigger-content"
          value={triggerContent}
          onChange={(e) => setTriggerContent(e.target.value)}
          className="min-h-16 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900"
        />
        {sessionConfig?.accessibilityMode && (
          <>
            <label htmlFor="trigger-caption" className="text-xs font-semibold text-ink-700">
              Legenda de acessibilidade
            </label>
            <input
              id="trigger-caption"
              value={triggerCaption}
              onChange={(e) => setTriggerCaption(e.target.value)}
              className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
            />
          </>
        )}
        <button
          type="button"
          disabled={sendingTrigger || triggerContent.trim().length === 0}
          onClick={() => void handleSendTrigger()}
          className="mt-1 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {sendingTrigger ? 'Enviando...' : 'Enviar gatilho'}
        </button>
      </div>

      {activity && !showLauncher ? (
        <div className="mt-4 rounded-xl border border-line-200 p-4">
          <p className="text-sm font-medium text-ink-700">{activity.content.question}</p>
          {tally.kind === 'options' ? (
            <ul className="mt-3 space-y-2">
              {(optionsFromContent(activity.content) ?? []).map((option, index) => {
                const total = tally.counts.reduce((a, b) => a + b, 0);
                const count = tally.counts[index] ?? 0;
                const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                return (
                  <li key={option}>
                    <div className="flex justify-between text-xs font-medium text-ink-700">
                      <span>{option}</span>
                      <span>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-canvas">
                      <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="mt-3 space-y-1">
              {tally.texts.length === 0 ? (
                <li className="text-xs text-ink-500">Nenhuma resposta ainda.</li>
              ) : (
                tally.texts.map((text, index) => (
                  <li key={index} className="rounded-lg bg-canvas px-3 py-2 text-xs text-ink-700">
                    {text}
                  </li>
                ))
              )}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setShowLauncher(true)}
            className="mt-3 min-h-11 rounded-full border border-line-200 px-4 text-xs font-semibold text-ink-700"
          >
            Nova atividade
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-line-200 p-4">
          <label htmlFor="activity-type" className="text-xs font-semibold text-ink-700">
            Tipo
          </label>
          <select
            id="activity-type"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          >
            <option value="quiz">Quiz</option>
            <option value="poll">Enquete</option>
            <option value="open_question">Pergunta aberta</option>
          </select>

          <label htmlFor="activity-question" className="text-xs font-semibold text-ink-700">
            Pergunta
          </label>
          <input
            id="activity-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-11 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />

          {needsOptions && (
            <div className="flex flex-col gap-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  {type === 'quiz' && (
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      aria-label={`Opção ${index + 1} é a correta`}
                    />
                  )}
                  <input
                    value={option}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Opção ${index + 1}`}
                    className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setOptions([...options, ''])}
                className="text-xs font-semibold text-brand-600"
              >
                + Adicionar opção
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={launching || !question.trim()}
            onClick={() => void handleLaunch()}
            className="mt-2 min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {launching ? 'Lançando...' : 'Lançar atividade'}
          </button>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/ModoAulaProfessor.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ModoAulaProfessor.tsx web/src/components/ModoAulaProfessor.test.tsx
git commit -m "feat: add session config toggles and content trigger form to ModoAulaProfessor"
```

---

## Task 6: `ModoAulaAluno` — show the content trigger

**Files:**
- Modify: `web/src/components/ModoAulaAluno.tsx`
- Modify: `web/src/components/ModoAulaAluno.test.tsx`

**Interfaces:**
- Consumes: `ContentTrigger` from Task 2.
- Produces (for Task 8): props gain `contentTrigger: ContentTrigger |
  null`.

- [ ] **Step 1: Update the test file**

```tsx
// web/src/components/ModoAulaAluno.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModoAulaAluno } from './ModoAulaAluno';

describe('ModoAulaAluno', () => {
  it('joins a session by code', () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaAluno
        session={null}
        activity={null}
        contentTrigger={null}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={onJoin}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Código da aula'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Entrar na aula'));

    expect(onJoin).toHaveBeenCalledWith('1234');
  });

  it('answers a quiz activity', () => {
    const onSubmitAnswer = vi.fn().mockResolvedValue(undefined);
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        contentTrigger={null}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={onSubmitAnswer}
        onLeave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('4'));
    expect(onSubmitAnswer).toHaveBeenCalledWith({ selectedIndex: 1 });
  });

  it('shows the waiting message once answered', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={{
          id: 'activity-1',
          type: 'quiz',
          content: { question: 'Quanto é 2+2?', options: ['3', '4'], correct_index: 1 },
        }}
        contentTrigger={null}
        answered={true}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByText(/Resposta enviada/)).toBeInTheDocument();
  });

  it('shows the latest content trigger with its accessibility caption', () => {
    render(
      <ModoAulaAluno
        session={{ id: 'session-1', code: '1234', status: 'active' }}
        activity={null}
        contentTrigger={{
          id: 'trigger-1',
          type: 'formula',
          content: 'E = mc²',
          accessibilityCaption: 'Energia igual massa vezes velocidade da luz ao quadrado',
        }}
        answered={false}
        joining={false}
        joinError={null}
        onJoin={vi.fn()}
        onSubmitAnswer={vi.fn()}
        onLeave={vi.fn()}
      />,
    );

    expect(screen.getByText('E = mc²')).toBeInTheDocument();
    expect(screen.getByText('Energia igual massa vezes velocidade da luz ao quadrado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/ModoAulaAluno.test.tsx`
Expected: FAIL — `contentTrigger` prop missing, last test can't find the
text.

- [ ] **Step 3: Update the component**

Replace `web/src/components/ModoAulaAluno.tsx` entirely:

```tsx
import { useState } from 'react';
import type { ActivityContent, ContentTrigger, LiveActivity, LiveSession } from '../types/modoAula';

interface ModoAulaAlunoProps {
  session: LiveSession | null;
  activity: LiveActivity | null;
  contentTrigger: ContentTrigger | null;
  answered: boolean;
  joining: boolean;
  joinError: string | null;
  onJoin: (code: string) => Promise<void>;
  onSubmitAnswer: (payload: { selectedIndex?: number; text?: string }) => Promise<void>;
  onLeave: () => void;
}

function optionsFromContent(content: ActivityContent): string[] | null {
  return 'options' in content ? content.options : null;
}

function TriggerCard({ trigger }: { trigger: ContentTrigger }) {
  return (
    <section className="rounded-2xl border border-brand-500 bg-brand-50 p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-600">
        {trigger.type === 'formula' ? 'Fórmula' : 'Anotação'} do professor
      </h2>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-ink-700">{trigger.content}</p>
      {trigger.accessibilityCaption && (
        <p className="mt-2 text-xs italic text-ink-500">{trigger.accessibilityCaption}</p>
      )}
    </section>
  );
}

export function ModoAulaAluno({
  session,
  activity,
  contentTrigger,
  answered,
  joining,
  joinError,
  onJoin,
  onSubmitAnswer,
  onLeave,
}: ModoAulaAlunoProps) {
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAnswer(payload: { selectedIndex?: number; text?: string }) {
    setSubmitting(true);
    try {
      await onSubmitAnswer(payload);
    } finally {
      setSubmitting(false);
    }
  }

  if (!session || session.status === 'finished') {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        {session?.status === 'finished' && (
          <p className="mt-1 text-xs text-ink-500">Aula encerrada. Até a próxima!</p>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={4}
            placeholder="Código da aula"
            aria-label="Código da aula"
            className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20"
          />
          <button
            type="button"
            disabled={joining || code.trim().length === 0}
            onClick={() => void onJoin(code.trim())}
            className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {joining ? 'Entrando...' : 'Entrar na aula'}
          </button>
        </div>
        {joinError && <p className="mt-2 text-xs text-danger-600">{joinError}</p>}
      </section>
    );
  }

  if (!activity) {
    return (
      <div className="space-y-4">
        {contentTrigger && <TriggerCard trigger={contentTrigger} />}
        <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
          <p className="mt-1 text-xs text-ink-500">Aguardando o professor iniciar uma atividade...</p>
          <button type="button" onClick={onLeave} className="mt-3 text-xs font-semibold text-ink-500">
            Sair
          </button>
        </section>
      </div>
    );
  }

  if (answered) {
    return (
      <div className="space-y-4">
        {contentTrigger && <TriggerCard trigger={contentTrigger} />}
        <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
          <p className="mt-1 text-xs text-success-600">Resposta enviada! Aguardando o professor.</p>
        </section>
      </div>
    );
  }

  const options = optionsFromContent(activity.content);

  return (
    <div className="space-y-4">
      {contentTrigger && <TriggerCard trigger={contentTrigger} />}
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Modo Aula</h2>
        <p className="mt-1 text-sm font-medium text-ink-700">{activity.content.question}</p>
        {options ? (
          <div className="mt-3 flex flex-col gap-2">
            {options.map((option, index) => (
              <button
                key={option}
                type="button"
                disabled={submitting}
                onClick={() => void handleAnswer({ selectedIndex: index })}
                className="min-h-11 rounded-lg border border-line-200 px-3 py-2 text-left text-sm transition-colors active:bg-canvas disabled:opacity-50"
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              className="min-h-20 rounded-lg border border-line-200 bg-canvas px-3 py-2 text-sm text-ink-900 outline-none transition-all duration-200 focus:border-brand-600 focus:bg-surface focus:ring-2 focus:ring-brand-600/20 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={submitting || text.trim().length === 0}
              onClick={() => void handleAnswer({ text: text.trim() })}
              className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/ModoAulaAluno.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ModoAulaAluno.tsx web/src/components/ModoAulaAluno.test.tsx
git commit -m "feat: show the latest content trigger in ModoAulaAluno"
```

---

## Task 7: Compose `ProfessorHome`

**Files:**
- Modify: `web/src/pages/ProfessorHome.tsx`

**Interfaces:**
- Consumes: `sessionConfig`, `sendContentTrigger` from Task 3's
  `useTeacherSession`; `ModoAulaProfessor`'s new props from Task 5.
- Produces: `/professor` fully wired to the new toggles/gatilhos flow.

No new unit test — pure composition; correctness checked by the full
suite + typecheck + manual/REST smoke check below.

- [ ] **Step 1: Update the page**

In `web/src/pages/ProfessorHome.tsx`, destructure `sessionConfig` and
`sendContentTrigger` from `useTeacherSession(teacherId)` and pass them
through to `<ModoAulaProfessor>`:

```tsx
// web/src/pages/ProfessorHome.tsx
import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { useSessionLiveStats } from '../hooks/useSessionLiveStats';
import { ModoAulaProfessor } from '../components/ModoAulaProfessor';
import type { LiveActivity, PollContent, QuizContent } from '../types/modoAula';

function optionCountFor(activity: LiveActivity | null): number | null {
  if (!activity) return null;
  if (activity.type === 'quiz' || activity.type === 'poll') {
    return (activity.content as QuizContent | PollContent).options.length;
  }
  return null;
}

export function ProfessorHome() {
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';

  const {
    classes,
    session,
    sessionConfig,
    activity,
    startSession,
    endSession,
    launchActivity,
    sendContentTrigger,
  } = useTeacherSession(teacherId);
  const tally = useSessionLiveStats(session?.id ?? null, activity?.id ?? null, optionCountFor(activity));

  if (!user) return null;

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
        <ModoAulaProfessor
          classes={classes}
          session={session}
          sessionConfig={sessionConfig}
          activity={activity}
          tally={tally}
          onStartSession={startSession}
          onEndSession={endSession}
          onLaunchActivity={launchActivity}
          onSendContentTrigger={sendContentTrigger}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Full test suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/ProfessorHome.tsx
git commit -m "feat: wire ProfessorHome to session config toggles and content triggers"
```

---

## Task 8: Compose `AlunoHome`

**Files:**
- Modify: `web/src/pages/AlunoHome.tsx`

**Interfaces:**
- Consumes: `contentTrigger` from Task 4's `useLiveSession`;
  `ModoAulaAluno`'s new prop from Task 6.
- Produces: `/aluno` shows the teacher's content triggers live during
  Modo Aula.

No new unit test — pure composition. Read the current file first (it has
a hero banner, tab bar, mood overlay, and the Tutor FAB already wired in
from earlier work) — only add the one new prop to the existing
`<ModoAulaAluno>` call, don't restructure anything else.

- [ ] **Step 1: Pass `contentTrigger` through**

In `web/src/pages/AlunoHome.tsx`, destructure `contentTrigger` from the
existing `useLiveSession(studentId)` call (alongside `session`,
`activity`, etc.) and add it to the existing `<ModoAulaAluno>` element:

```tsx
const {
  session: liveSession,
  activity: liveActivity,
  contentTrigger: liveContentTrigger,
  answered: liveAnswered,
  joining: liveJoining,
  joinError: liveJoinError,
  join: joinLiveSession,
  submitAnswer: submitLiveAnswer,
  leave: leaveLiveSession,
} = useLiveSession(studentId);
```

```tsx
<ModoAulaAluno
  session={liveSession}
  activity={liveActivity}
  contentTrigger={liveContentTrigger}
  answered={liveAnswered}
  joining={liveJoining}
  joinError={liveJoinError}
  onJoin={joinLiveSession}
  onSubmitAnswer={submitLiveAnswer}
  onLeave={leaveLiveSession}
/>
```

- [ ] **Step 2: Full test suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 3: End-to-end smoke check against Supabase Cloud**

Same REST technique used in the Modo Aula plan's Task 8 (no browser tool
in this environment):
1. Log in as `professor@demo.foco`, `POST .../rest/v1/sessions` with the
   5 new columns included (e.g. `accessibility_mode: true`) plus the
   usual `class_id`/`teacher_id`/`code`/`status`.
2. `POST .../rest/v1/content_triggers` as the professor with
   `{session_id, type: 'formula', content: 'E = mc²', accessibility_caption:
   '...'}`.
3. Log in as `aluno1@demo.foco`, `GET
   .../rest/v1/content_triggers?session_id=eq.<id>&select=*`.
4. Log in as `aluno2@demo.foco` (different student, not testing isolation
   here since select is intentionally open) — just confirm it also gets
   the row, proving the "any authenticated" read policy works as
   designed.

Expected: step 1 succeeds (confirms the 5-column insert works against
real RLS from Task 1's teacher-write policies, unaffected by this plan);
steps 3-4 both return the inserted trigger row.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/AlunoHome.tsx
git commit -m "feat: show live content triggers on AlunoHome's Modo Aula card"
```

---

## Self-Review Notes

- **Spec coverage:** "Dados" (schema) → Task 1; "Tipos novos" → Task 2;
  `useTeacherSession` additions → Task 3; `useLiveSession` additions →
  Task 4; "Professor" UI → Task 5; "Aluno" UI → Task 6; page compositions
  → Tasks 7-8. "Fora de escopo" items (image trigger type, real behavior
  for the other 4 toggles, trigger history) are explicitly not built
  anywhere in this plan.
- **Placeholder scan:** none — every step has runnable code or a concrete
  command with expected output.
- **Type consistency:** `SessionConfig`/`ContentTriggerType`/
  `ContentTrigger` (Task 2) used identically across Tasks 3-8;
  `sessionConfig` deliberately kept out of the shared `LiveSession` type
  (spec note) — `useLiveSession`/`ModoAulaAluno`'s `session` prop shape is
  untouched by this plan, only `contentTrigger` is new there.
