# Gestão de Disciplina + Acompanhamento Agregado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the teacher manage their own disciplines (subjects), assign
one to each class, and see an aggregated, name-free overview of how each
class is doing (sessions held, distinct participants, quiz accuracy).

**Architecture:** Same direct-to-Supabase pattern as the rest of the app.
`disciplines` is a new teacher-owned table; `classes` gains a nullable
`discipline_id`. The overview is computed **entirely client-side** from
data the teacher already has RLS access to (own `sessions`, `activities`,
and `activity_answer` rows via the existing
`student_events_select_teacher_activity_answers` policy) — no new RLS for
reading `student_events`. `TurmaOverview` is a self-contained ("smart")
component that owns its own `useClassOverview` call, so `ProfessorHome`
can render one per class in a `.map()` without violating the rules of
hooks (same documented exception pattern as `ChatTutor` — see CLAUDE.md
§ Convenções de código).

**Tech Stack:** React 19, TypeScript, `@supabase/supabase-js`, Vitest +
Testing Library, Tailwind (existing tokens).

**Spec:** `docs/superpowers/specs/2026-09-12-disciplinas-acompanhamento-design.md`

## Global Constraints

- **Never show a student's name or per-student number to the teacher.**
  The overview is always aggregated (session count, distinct participant
  count, quiz accuracy %) — this was explicitly confirmed with the user
  before this plan, per the CLAUDE.md principle that a teacher must never
  see who specifically answered what.
- "Students of a class" is defined operationally as "distinct students
  who submitted at least one `activity_answer` in one of that class's
  sessions" — there is no enrollment table (same gap already hit and
  deliberately not solved when building the Escola dashboard). Do not add
  one here either.
- The teacher's `domain_progress`/Raio-X data stays completely
  inaccessible to the teacher — this plan never touches that table or its
  RLS.
- No `delete` on `disciplines` — only create/rename, to avoid dealing with
  `classes.discipline_id` pointing at a removed row.
- Tipagem estrita: no `any`.
- Supabase Cloud target: apply migrations with `npx supabase db query
  --db-url "$DATABASE_URL" --file <path>`, reading `DATABASE_URL` from
  the repo's `.env`. A file with more than one SQL statement must be
  split into separate single-statement files before applying.

---

## Task 1: Migration — `disciplines` table + `classes.discipline_id`

**Files:**
- Create: `supabase/migrations/00011_disciplines.sql`

**Interfaces:**
- Consumes: `users`, `classes` (existing).
- Produces: table `disciplines(id, teacher_id, name, created_at)` with
  RLS; `classes.discipline_id` column; a new `classes_update_own` RLS
  policy (today `classes` only has a `select` policy — without this the
  teacher can't assign a discipline to their own class).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00011_disciplines.sql
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

alter table classes add column discipline_id uuid references disciplines(id);

create policy classes_update_own on classes
  for update using (teacher_id = auth.uid());
```

- [ ] **Step 2: Apply to Supabase Cloud (split into single statements)**

```bash
mkdir -p /tmp/disciplinas-migration
cat > /tmp/disciplinas-migration/01_create_table.sql <<'EOF'
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references users(id),
  name text not null,
  created_at timestamptz not null default now()
);
EOF
cat > /tmp/disciplinas-migration/02_enable_rls.sql <<'EOF'
alter table disciplines enable row level security;
EOF
cat > /tmp/disciplinas-migration/03_select_policy.sql <<'EOF'
create policy disciplines_select_own on disciplines
  for select using (teacher_id = auth.uid());
EOF
cat > /tmp/disciplinas-migration/04_insert_policy.sql <<'EOF'
create policy disciplines_insert_own on disciplines
  for insert with check (teacher_id = auth.uid());
EOF
cat > /tmp/disciplinas-migration/05_update_policy.sql <<'EOF'
create policy disciplines_update_own on disciplines
  for update using (teacher_id = auth.uid());
EOF
cat > /tmp/disciplinas-migration/06_classes_column.sql <<'EOF'
alter table classes add column discipline_id uuid references disciplines(id);
EOF
cat > /tmp/disciplinas-migration/07_classes_update_policy.sql <<'EOF'
create policy classes_update_own on classes
  for update using (teacher_id = auth.uid());
EOF

for f in 01_create_table.sql 02_enable_rls.sql 03_select_policy.sql 04_insert_policy.sql 05_update_policy.sql 06_classes_column.sql 07_classes_update_policy.sql; do
  npx supabase db query --db-url "$DATABASE_URL" --file /tmp/disciplinas-migration/$f
done
```
Expected: `CREATE TABLE`, `ALTER TABLE`, `CREATE POLICY` ×3, `ALTER
TABLE`, `CREATE POLICY` — no errors.

- [ ] **Step 3: Verify**

Run: `npx supabase db query --db-url "$DATABASE_URL" "select policyname from pg_policies where tablename in ('disciplines','classes') order by 1"`
Expected: includes `classes_select_authenticated`,
`classes_update_own`, `disciplines_insert_own`,
`disciplines_select_own`, `disciplines_update_own`.

Run: `npx supabase db query --db-url "$DATABASE_URL" "select column_name from information_schema.columns where table_name = 'classes' and column_name = 'discipline_id'"`
Expected: `discipline_id`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00011_disciplines.sql
git commit -m "feat: add disciplines table and classes.discipline_id"
```

---

## Task 2: Types

**Files:**
- Create: `web/src/types/disciplina.ts`
- Modify: `web/src/types/modoAula.ts`

**Interfaces:**
- Produces (for Tasks 3-8): `Discipline { id: string; name: string }`;
  `ClassOverview { sessionCount: number; participantCount: number;
  quizAccuracy: number | null }`; `TeacherClass` (existing, in
  `modoAula.ts`) gains an **optional** `disciplineId?: string | null` —
  optional so the existing `ModoAulaProfessor.test.tsx` literals (which
  construct `TeacherClass` without this field) keep compiling untouched.

- [ ] **Step 1: Create the new types file**

```ts
// web/src/types/disciplina.ts
export interface Discipline {
  id: string;
  name: string;
}

export interface ClassOverview {
  sessionCount: number;
  participantCount: number;
  quizAccuracy: number | null;
}
```

- [ ] **Step 2: Extend `TeacherClass`**

In `web/src/types/modoAula.ts`, change:

```ts
export interface TeacherClass {
  id: string;
  name: string;
}
```

to:

```ts
export interface TeacherClass {
  id: string;
  name: string;
  disciplineId?: string | null;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/types/disciplina.ts web/src/types/modoAula.ts
git commit -m "feat: add Discipline and ClassOverview types"
```

---

## Task 3: `useDisciplines` hook

**Files:**
- Create: `web/src/hooks/useDisciplines.ts`
- Create: `web/src/hooks/useDisciplines.test.ts`

**Interfaces:**
- Consumes: `Discipline` from Task 2.
- Produces (for Task 6, 8): `useDisciplines(teacherId: string): {
  disciplines: Discipline[]; loading: boolean; createDiscipline: (name:
  string) => Promise<void>; renameDiscipline: (id: string, name: string)
  => Promise<void> }`.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/hooks/useDisciplines.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDisciplines } from './useDisciplines';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const disciplinesBuilder = chainable({ data: [{ id: 'disc-1', name: 'Matemática' }], error: null });

const fromMock = vi.fn(() => disciplinesBuilder);

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useDisciplines', () => {
  it("loads the teacher's disciplines", async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.disciplines).toEqual([{ id: 'disc-1', name: 'Matemática' }]);
  });

  it('creates a new discipline', async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createDiscipline('Português');
    });

    expect(disciplinesBuilder.insert).toHaveBeenCalledWith({ teacher_id: 'teacher-1', name: 'Português' });
  });

  it('renames an existing discipline', async () => {
    const { result } = renderHook(() => useDisciplines('teacher-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.renameDiscipline('disc-1', 'Matemática Básica');
    });

    expect(disciplinesBuilder.update).toHaveBeenCalledWith({ name: 'Matemática Básica' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useDisciplines.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// web/src/hooks/useDisciplines.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Discipline } from '../types/disciplina';

interface UseDisciplinesResult {
  disciplines: Discipline[];
  loading: boolean;
  createDiscipline: (name: string) => Promise<void>;
  renameDiscipline: (id: string, name: string) => Promise<void>;
}

export function useDisciplines(teacherId: string): UseDisciplinesResult {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!teacherId) {
      setDisciplines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('disciplines').select('id, name').eq('teacher_id', teacherId).order('name');
    setDisciplines((data ?? []) as Discipline[]);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createDiscipline = useCallback(
    async (name: string) => {
      const { error } = await supabase.from('disciplines').insert({ teacher_id: teacherId, name });
      if (error) throw error;
      await refetch();
    },
    [teacherId, refetch],
  );

  const renameDiscipline = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase.from('disciplines').update({ name }).eq('id', id);
      if (error) throw error;
      await refetch();
    },
    [refetch],
  );

  return { disciplines, loading, createDiscipline, renameDiscipline };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useDisciplines.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/hooks/useDisciplines.ts web/src/hooks/useDisciplines.test.ts
git commit -m "feat: add useDisciplines hook"
```

---

## Task 4: `useClassOverview` hook

**Files:**
- Create: `web/src/hooks/useClassOverview.ts`
- Create: `web/src/hooks/useClassOverview.test.ts`

**Interfaces:**
- Consumes: `ClassOverview` from Task 2; `QuizContent` from
  `web/src/types/modoAula.ts` (existing).
- Produces (for Task 7): `useClassOverview(classId: string | null): {
  overview: ClassOverview; loading: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/hooks/useClassOverview.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClassOverview } from './useClassOverview';

let sessionsResult: { data: unknown; error: unknown } = {
  data: [{ id: 'session-1' }, { id: 'session-2' }],
  error: null,
};

function chainable(getResult: () => { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (v: ReturnType<typeof getResult>) => void) => resolve(getResult()),
  };
  return builder;
}

const sessionsBuilder = chainable(() => sessionsResult);
const activitiesBuilder = chainable(() => ({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 1 } }],
  error: null,
}));
const studentEventsBuilder = chainable(() => ({
  data: [
    { student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } },
    { student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 0 } },
    { student_id: 'student-2', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } },
  ],
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
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useClassOverview', () => {
  beforeEach(() => {
    sessionsResult = { data: [{ id: 'session-1' }, { id: 'session-2' }], error: null };
  });

  it('aggregates sessions, distinct participants, and quiz accuracy', async () => {
    const { result } = renderHook(() => useClassOverview('class-1'));

    await waitFor(() =>
      expect(result.current.overview).toEqual({
        sessionCount: 2,
        participantCount: 2,
        quizAccuracy: 67,
      }),
    );
  });

  it('reports an empty overview when the class has no sessions yet', async () => {
    sessionsResult = { data: [], error: null };
    const { result } = renderHook(() => useClassOverview('class-2'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.overview).toEqual({ sessionCount: 0, participantCount: 0, quizAccuracy: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useClassOverview.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// web/src/hooks/useClassOverview.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { ClassOverview } from '../types/disciplina';
import type { ActivityContent, QuizContent } from '../types/modoAula';

interface SessionRow {
  id: string;
}

interface ActivityRow {
  id: string;
  type: string;
  content_json: ActivityContent;
}

interface AnswerRow {
  student_id: string;
  payload_json: { activity_id: string; type: string; selected_index?: number };
}

const EMPTY_OVERVIEW: ClassOverview = { sessionCount: 0, participantCount: 0, quizAccuracy: null };

export function useClassOverview(classId: string | null): { overview: ClassOverview; loading: boolean } {
  const [overview, setOverview] = useState<ClassOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!classId) {
      setOverview(EMPTY_OVERVIEW);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: sessionRows } = await supabase.from('sessions').select('id').eq('class_id', classId);
    const sessionIds = ((sessionRows ?? []) as SessionRow[]).map((row) => row.id);

    if (sessionIds.length === 0) {
      setOverview(EMPTY_OVERVIEW);
      setLoading(false);
      return;
    }

    const { data: activityRows } = await supabase
      .from('activities')
      .select('id, type, content_json')
      .in('session_id', sessionIds);
    const activitiesById = new Map(((activityRows ?? []) as ActivityRow[]).map((row) => [row.id, row]));

    const { data: answerRows } = await supabase
      .from('student_events')
      .select('student_id, payload_json')
      .eq('event_type', 'activity_answer')
      .in('session_id', sessionIds);
    const answers = (answerRows ?? []) as AnswerRow[];

    const participantIds = new Set(answers.map((row) => row.student_id));

    let quizTotal = 0;
    let quizCorrect = 0;
    for (const answer of answers) {
      const activity = activitiesById.get(answer.payload_json.activity_id);
      if (!activity || activity.type !== 'quiz') continue;
      quizTotal += 1;
      const correctIndex = (activity.content_json as QuizContent).correct_index;
      if (answer.payload_json.selected_index === correctIndex) quizCorrect += 1;
    }

    setOverview({
      sessionCount: sessionIds.length,
      participantCount: participantIds.size,
      quizAccuracy: quizTotal === 0 ? null : Math.round((quizCorrect / quizTotal) * 100),
    });
    setLoading(false);
  }, [classId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { overview, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useClassOverview.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useClassOverview.ts web/src/hooks/useClassOverview.test.ts
git commit -m "feat: add useClassOverview hook (aggregated, no student names)"
```

---

## Task 5: `useTeacherSession` — classes with discipline + `assignDiscipline`

**Files:**
- Modify: `web/src/hooks/useTeacherSession.ts`
- Modify: `web/src/hooks/useTeacherSession.test.ts`

**Interfaces:**
- Produces (for Task 8): `classes: TeacherClass[]` now includes
  `disciplineId`; new `assignDiscipline(classId: string, disciplineId:
  string): Promise<void>`.

- [ ] **Step 1: Update the test file**

In `web/src/hooks/useTeacherSession.test.ts`, update `classesBuilder`'s
data to include `discipline_id`, and add one new test. Full replacement:

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

const classesBuilder = chainable({
  data: [{ id: 'class-1', name: 'Turma Demo', discipline_id: null }],
  error: null,
});
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

  it('loads classes with their assigned discipline', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() =>
      expect(result.current.classes).toEqual([{ id: 'class-1', name: 'Turma Demo', disciplineId: null }]),
    );
  });

  it('assigns a discipline to a class', async () => {
    const { result } = renderHook(() => useTeacherSession('teacher-1'));
    await waitFor(() => expect(result.current.classes.length).toBe(1));

    await act(async () => {
      await result.current.assignDiscipline('class-1', 'disc-1');
    });

    expect(classesBuilder.update).toHaveBeenCalledWith({ discipline_id: 'disc-1' });
  });
});
```

- [ ] **Step 2: Run test to verify the new tests fail**

Run: `cd web && npx vitest run src/hooks/useTeacherSession.test.ts`
Expected: FAIL — `classes` don't include `disciplineId`,
`assignDiscipline` undefined.

- [ ] **Step 3: Update the hook**

In `web/src/hooks/useTeacherSession.ts`:

1. Replace the classes-fetching `useEffect` with a `refetchClasses`
   `useCallback` (so `assignDiscipline` can call it after updating), and
   select `discipline_id` too:

```ts
const refetchClasses = useCallback(async () => {
  if (!teacherId) {
    setClasses([]);
    return;
  }
  const { data } = await supabase.from('classes').select('id, name, discipline_id').eq('teacher_id', teacherId);
  setClasses(
    ((data ?? []) as { id: string; name: string; discipline_id: string | null }[]).map((row) => ({
      id: row.id,
      name: row.name,
      disciplineId: row.discipline_id,
    })),
  );
}, [teacherId]);

useEffect(() => {
  void refetchClasses();
}, [refetchClasses]);
```

(replaces the old inline `useEffect` that did `supabase.from('classes').select('id, name')...` directly)

2. Add `assignDiscipline` alongside the other actions:

```ts
const assignDiscipline = useCallback(
  async (classId: string, disciplineId: string) => {
    const { error } = await supabase.from('classes').update({ discipline_id: disciplineId }).eq('id', classId);
    if (error) throw error;
    await refetchClasses();
  },
  [refetchClasses],
);
```

3. Add `assignDiscipline` to `UseTeacherSessionResult` and the returned
   object.

The full updated file:

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

interface ClassRow {
  id: string;
  name: string;
  discipline_id: string | null;
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
  assignDiscipline: (classId: string, disciplineId: string) => Promise<void>;
}

export function useTeacherSession(teacherId: string): UseTeacherSessionResult {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [activity, setActivity] = useState<LiveActivity | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchClasses = useCallback(async () => {
    if (!teacherId) {
      setClasses([]);
      return;
    }
    const { data } = await supabase.from('classes').select('id, name, discipline_id').eq('teacher_id', teacherId);
    setClasses(
      ((data ?? []) as ClassRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        disciplineId: row.discipline_id,
      })),
    );
  }, [teacherId]);

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
    void refetchClasses();
  }, [refetchClasses]);

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

  const assignDiscipline = useCallback(
    async (classId: string, disciplineId: string) => {
      const { error } = await supabase.from('classes').update({ discipline_id: disciplineId }).eq('id', classId);
      if (error) throw error;
      await refetchClasses();
    },
    [refetchClasses],
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
    assignDiscipline,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useTeacherSession.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/hooks/useTeacherSession.ts web/src/hooks/useTeacherSession.test.ts
git commit -m "feat: add assignDiscipline and disciplineId to useTeacherSession"
```

---

## Task 6: `DisciplinaManager` component

**Files:**
- Create: `web/src/components/DisciplinaManager.tsx`
- Create: `web/src/components/DisciplinaManager.test.tsx`

**Interfaces:**
- Consumes: `Discipline` from Task 2.
- Produces (for Task 8): `<DisciplinaManager disciplines={Discipline[]}
  onCreate={(name: string) => Promise<void>} onRename={(id: string, name:
  string) => Promise<void>} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/DisciplinaManager.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisciplinaManager } from './DisciplinaManager';

describe('DisciplinaManager', () => {
  it('creates a new discipline', () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DisciplinaManager disciplines={[]} onCreate={onCreate} onRename={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nova disciplina'), { target: { value: 'Matemática' } });
    fireEvent.click(screen.getByText('Criar'));

    expect(onCreate).toHaveBeenCalledWith('Matemática');
  });

  it('renames an existing discipline', () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <DisciplinaManager
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onCreate={vi.fn()}
        onRename={onRename}
      />,
    );

    fireEvent.click(screen.getByText('Renomear'));
    fireEvent.change(screen.getByLabelText('Renomear Matemática'), { target: { value: 'Matemática Básica' } });
    fireEvent.click(screen.getByText('Salvar'));

    expect(onRename).toHaveBeenCalledWith('disc-1', 'Matemática Básica');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/DisciplinaManager.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// web/src/components/DisciplinaManager.tsx
import { useState } from 'react';
import type { Discipline } from '../types/disciplina';

interface DisciplinaManagerProps {
  disciplines: Discipline[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}

export function DisciplinaManager({ disciplines, onCreate, onRename }: DisciplinaManagerProps) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate(trimmed);
    setName('');
  }

  async function handleRename(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await onRename(id, trimmed);
    setEditingId(null);
  }

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">Disciplinas</h2>
      <ul className="mt-3 space-y-2">
        {disciplines.map((d) => (
          <li key={d.id} className="flex items-center gap-2">
            {editingId === d.id ? (
              <>
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  aria-label={`Renomear ${d.name}`}
                  className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
                />
                <button
                  type="button"
                  onClick={() => void handleRename(d.id)}
                  className="text-xs font-semibold text-brand-600"
                >
                  Salvar
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink-700">{d.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(d.id);
                    setEditingName(d.name);
                  }}
                  className="text-xs font-semibold text-ink-500"
                >
                  Renomear
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova disciplina"
          aria-label="Nova disciplina"
          className="min-h-11 flex-1 rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
        />
        <button
          type="button"
          disabled={name.trim().length === 0}
          onClick={() => void handleCreate()}
          className="min-h-11 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          Criar
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/DisciplinaManager.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/DisciplinaManager.tsx web/src/components/DisciplinaManager.test.tsx
git commit -m "feat: add DisciplinaManager component"
```

---

## Task 7: `TurmaOverview` component (self-contained)

**Files:**
- Create: `web/src/components/TurmaOverview.tsx`
- Create: `web/src/components/TurmaOverview.test.tsx`

**Interfaces:**
- Consumes: `useClassOverview` from Task 4; `Discipline` from Task 2;
  `TeacherClass` from `web/src/types/modoAula.ts`.
- Produces (for Task 8): `<TurmaOverview classInfo={TeacherClass}
  disciplines={Discipline[]} onAssignDiscipline={(classId: string,
  disciplineId: string) => Promise<void>} />`. This component owns its
  own `useClassOverview(classInfo.id)` call internally (documented
  exception to "hooks live in the page", same as `ChatTutor` — see
  CLAUDE.md § Convenções de código) so `ProfessorHome` can render one per
  class in a `.map()` without violating the rules of hooks.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/TurmaOverview.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TurmaOverview } from './TurmaOverview';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const sessionsBuilder = chainable({ data: [{ id: 'session-1' }], error: null });
const activitiesBuilder = chainable({
  data: [{ id: 'activity-1', type: 'quiz', content_json: { question: 'Q?', options: ['A', 'B'], correct_index: 1 } }],
  error: null,
});
const studentEventsBuilder = chainable({
  data: [{ student_id: 'student-1', payload_json: { activity_id: 'activity-1', type: 'quiz', selected_index: 1 } }],
  error: null,
});

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'sessions':
      return sessionsBuilder;
    case 'activities':
      return activitiesBuilder;
    case 'student_events':
      return studentEventsBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('TurmaOverview', () => {
  it('assigns a discipline to the class', () => {
    const onAssignDiscipline = vi.fn().mockResolvedValue(undefined);
    render(
      <TurmaOverview
        classInfo={{ id: 'class-1', name: 'Turma Demo', disciplineId: null }}
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onAssignDiscipline={onAssignDiscipline}
      />,
    );

    fireEvent.change(screen.getByLabelText('Disciplina'), { target: { value: 'disc-1' } });
    expect(onAssignDiscipline).toHaveBeenCalledWith('class-1', 'disc-1');
  });

  it('shows the aggregated overview once loaded', async () => {
    render(
      <TurmaOverview
        classInfo={{ id: 'class-1', name: 'Turma Demo', disciplineId: 'disc-1' }}
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onAssignDiscipline={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/TurmaOverview.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// web/src/components/TurmaOverview.tsx
import { useClassOverview } from '../hooks/useClassOverview';
import type { Discipline } from '../types/disciplina';
import type { TeacherClass } from '../types/modoAula';

interface TurmaOverviewProps {
  classInfo: TeacherClass;
  disciplines: Discipline[];
  onAssignDiscipline: (classId: string, disciplineId: string) => Promise<void>;
}

export function TurmaOverview({ classInfo, disciplines, onAssignDiscipline }: TurmaOverviewProps) {
  const { overview, loading } = useClassOverview(classInfo.id);

  return (
    <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-700">{classInfo.name}</h2>

      <label htmlFor={`discipline-${classInfo.id}`} className="mt-2 block text-xs font-semibold text-ink-700">
        Disciplina
      </label>
      <select
        id={`discipline-${classInfo.id}`}
        value={classInfo.disciplineId ?? ''}
        onChange={(e) => void onAssignDiscipline(classInfo.id, e.target.value)}
        className="min-h-11 w-full rounded-lg border border-line-200 bg-canvas px-3 text-sm text-ink-900"
      >
        <option value="" disabled>
          Selecione...
        </option>
        {disciplines.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {!loading && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-[11px] text-ink-500">Sessões</dt>
            <dd className="text-sm font-semibold text-ink-700">{overview.sessionCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-500">Alunos</dt>
            <dd className="text-sm font-semibold text-ink-700">{overview.participantCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-500">Acerto quiz</dt>
            <dd className="text-sm font-semibold text-ink-700">
              {overview.quizAccuracy === null ? '—' : `${overview.quizAccuracy}%`}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/TurmaOverview.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/TurmaOverview.tsx web/src/components/TurmaOverview.test.tsx
git commit -m "feat: add TurmaOverview component (discipline assignment + aggregated stats)"
```

---

## Task 8: Compose `ProfessorHome`

**Files:**
- Modify: `web/src/pages/ProfessorHome.tsx`

**Interfaces:**
- Consumes: `useDisciplines` (Task 3); `assignDiscipline`/`classes` with
  `disciplineId` from Task 5's `useTeacherSession`; `DisciplinaManager`
  (Task 6); `TurmaOverview` (Task 7).
- Produces: `/professor` shows discipline management and a
  per-class aggregated overview below the existing Modo Aula panel.

No new unit test — pure composition; correctness checked by the full
suite + typecheck + REST smoke check below.

- [ ] **Step 1: Update the page**

```tsx
// web/src/pages/ProfessorHome.tsx
import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useTeacherSession } from '../hooks/useTeacherSession';
import { useSessionLiveStats } from '../hooks/useSessionLiveStats';
import { useDisciplines } from '../hooks/useDisciplines';
import { ModoAulaProfessor } from '../components/ModoAulaProfessor';
import { DisciplinaManager } from '../components/DisciplinaManager';
import { TurmaOverview } from '../components/TurmaOverview';
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
    assignDiscipline,
  } = useTeacherSession(teacherId);
  const tally = useSessionLiveStats(session?.id ?? null, activity?.id ?? null, optionCountFor(activity));
  const { disciplines, createDiscipline, renameDiscipline } = useDisciplines(teacherId);

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

        <DisciplinaManager disciplines={disciplines} onCreate={createDiscipline} onRename={renameDiscipline} />

        {classes.map((c) => (
          <TurmaOverview key={c.id} classInfo={c} disciplines={disciplines} onAssignDiscipline={assignDiscipline} />
        ))}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Full test suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 3: End-to-end smoke check against Supabase Cloud**

No browser tool in this environment — verify via REST (same technique as
prior plans):
1. Log in as `professor@demo.foco`.
2. `POST .../rest/v1/disciplines` with `{teacher_id, name: 'Matemática'}`
   → expect `201`/row back.
3. `PATCH .../rest/v1/classes?id=eq.<Turma Demo id>` with
   `{discipline_id: <the id from step 2>}` → expect success (this is the
   first real use of the new `classes_update_own` policy — confirms it
   works).
4. `GET .../rest/v1/classes?id=eq.<Turma Demo id>&select=discipline_id` →
   confirm it reflects the assignment.

Expected: all four steps succeed with no RLS errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/ProfessorHome.tsx
git commit -m "feat: add discipline management and aggregated class overview to ProfessorHome"
```

---

## Self-Review Notes

- **Spec coverage:** "Dados" (schema) → Task 1; `types/disciplina.ts` +
  `TeacherClass.disciplineId` → Task 2; `useDisciplines` → Task 3;
  "Acompanhamento — cálculo" → Task 4; `useTeacherSession` additions →
  Task 5; `DisciplinaManager` → Task 6; `TurmaOverview` → Task 7; page
  composition → Task 8. "Fora de escopo" items (matrícula real,
  deletar disciplina, ligação com domain_progress, tela de criar turma)
  are explicitly not built anywhere in this plan.
- **Placeholder scan:** none — every step has runnable code or a concrete
  command with expected output.
- **Type consistency:** `Discipline`/`ClassOverview` (Task 2) used
  identically across Tasks 3-8; `TeacherClass.disciplineId` (Task 2)
  matches what Task 5's `useTeacherSession` populates and what Task 7's
  `TurmaOverview` reads (`classInfo.disciplineId`).
- **Privacy check:** every aggregate in `useClassOverview` (Task 4) is a
  count or percentage — no `student_id` (or any other per-student value)
  is ever returned from the hook or rendered by `TurmaOverview`. This was
  the explicit constraint confirmed with the user before writing the spec.
