# EscolaHome (Visão Agregada e Anonimizada) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `EscolaHome` placeholder with a dashboard of
aggregated, anonymized mood and engagement signals per class, fed by two
Postgres views that enforce k-anonymity (k=3) server-side — no raw student
row ever reaches the client.

**Architecture:** Two Postgres views (`school_mood_stats`,
`school_engagement_stats`) do all aggregation and k-anonymity filtering in
SQL; the frontend only ever reads already-safe rows via
`@supabase/supabase-js`, same direct-to-Supabase pattern as every other
page. One hook (`useSchoolStats`) fetches both views; one presentational
component (`EscolaDashboard`) renders totals; `EscolaHome` composes them.

**Tech Stack:** React 19, TypeScript, `@supabase/supabase-js`, Vitest +
Testing Library, Tailwind (existing `brand`/`ink`/`line`/`canvas`/`surface`
tokens).

**Spec:** `docs/superpowers/specs/2026-09-12-escola-home-design.md`

## Global Constraints

- k-anonymity threshold is **3 distinct students** (`count(distinct
  student_id) >= 3`) — counting events, not distinct students, would let
  one student's repeated actions fake a "safe" bucket (spec "Views
  agregadas").
- The two views never expose a `student_id` or any individual row — only
  `(class_id, day, mood|event_type, student_count)`.
- Views are **not** protected by RLS (Postgres views can't carry their own
  RLS policies) — access control is the `WHERE` clause embedded in each
  view's own definition, scoping to the caller's own `school_id` and to
  `role = 'school_admin'` via `auth.uid()`. Do not weaken that clause.
- No Realtime here — this is a historical dashboard, not a live session
  (unlike Modo Aula's tally).
- Tipagem estrita: no `any` (AGENTS.md §6.B).
- Supabase Cloud target: apply migrations with `npx supabase db query
  --db-url "$DATABASE_URL" --file <path>`, reading `DATABASE_URL` from the
  repo's `.env`. Multi-statement files must be split into separate
  single-statement files before applying — the CLI rejects multi-statement
  files with "cannot insert multiple commands into a prepared statement"
  (hit and worked around this exact way in
  `docs/superpowers/plans/2026-09-12-aluno-home.md` Task 1 and
  `docs/superpowers/plans/2026-09-12-modo-aula.md` Task 1).

---

## Task 1: Add `users.class_id` and assign the demo students

**Files:**
- Create: `supabase/migrations/00008_add_student_class_id.sql`
- Create: `supabase/migrations/00009_seed_student_class_assignment.sql`

**Interfaces:**
- Consumes: `users`, `classes` tables (existing).
- Produces: `users.class_id` — the column every later task's views join
  through to attribute an event to a class.

- [ ] **Step 1: Write the column migration**

```sql
-- supabase/migrations/00008_add_student_class_id.sql
alter table users add column class_id uuid references classes(id);
```

- [ ] **Step 2: Write the seed migration**

```sql
-- supabase/migrations/00009_seed_student_class_assignment.sql
update users set class_id = '44444444-4444-4444-4444-444444444444'
where id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223',
  '22222222-2222-2222-2222-222222222224',
  '22222222-2222-2222-2222-222222222225'
);
```

- [ ] **Step 3: Apply both migrations to Supabase Cloud**

Run:
```bash
npx supabase db query --db-url "$DATABASE_URL" --file supabase/migrations/00008_add_student_class_id.sql
npx supabase db query --db-url "$DATABASE_URL" --file supabase/migrations/00009_seed_student_class_assignment.sql
```
Expected: `ALTER TABLE` then `UPDATE 5` (each file is a single statement,
no split needed).

- [ ] **Step 4: Verify**

Run: `npx supabase db query --db-url "$DATABASE_URL" "select count(*) from users where class_id is not null"`
Expected: `5`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/00008_add_student_class_id.sql supabase/migrations/00009_seed_student_class_assignment.sql
git commit -m "feat: add users.class_id and assign demo students to Turma Demo"
```

---

## Task 2: Aggregate views (`school_mood_stats`, `school_engagement_stats`)

**Files:**
- Create: `supabase/migrations/00010_school_aggregate_views.sql`

**Interfaces:**
- Consumes: `student_events`, `users` (with `class_id` from Task 1).
- Produces: views `school_mood_stats(school_id, class_id, day, mood,
  student_count)` and `school_engagement_stats(school_id, class_id, day,
  event_type, student_count)` — the only tables/views Task 3's hook reads
  from.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00010_school_aggregate_views.sql
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

- [ ] **Step 2: Apply to Supabase Cloud (split into single statements)**

The file has 3 statements (2 `create view`, 1 `grant`) — split into 3 temp
files before applying, same workaround as prior plans:

```bash
mkdir -p /tmp/escola-migration
awk '/^create view school_mood_stats/,/having count.*>= 3;/' supabase/migrations/00010_school_aggregate_views.sql > /tmp/escola-migration/01_mood_view.sql
awk '/^create view school_engagement_stats/,/having count.*>= 3;/' supabase/migrations/00010_school_aggregate_views.sql > /tmp/escola-migration/02_engagement_view.sql
echo "grant select on school_mood_stats, school_engagement_stats to authenticated;" > /tmp/escola-migration/03_grant.sql

npx supabase db query --db-url "$DATABASE_URL" --file /tmp/escola-migration/01_mood_view.sql
npx supabase db query --db-url "$DATABASE_URL" --file /tmp/escola-migration/02_engagement_view.sql
npx supabase db query --db-url "$DATABASE_URL" --file /tmp/escola-migration/03_grant.sql
```
Expected: `CREATE VIEW`, `CREATE VIEW`, `GRANT` — no errors.

- [ ] **Step 3: Verify the views exist and are scoped**

Run: `npx supabase db query --db-url "$DATABASE_URL" "select table_name from information_schema.views where table_schema = 'public' and table_name like 'school_%'"`
Expected: `school_mood_stats`, `school_engagement_stats`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00010_school_aggregate_views.sql
git commit -m "feat: add k-anonymous school_mood_stats/school_engagement_stats views"
```

---

## Task 3: Types + `useSchoolStats` hook

**Files:**
- Create: `web/src/types/escola.ts`
- Create: `web/src/hooks/useSchoolStats.ts`
- Test: `web/src/hooks/useSchoolStats.test.ts`

**Interfaces:**
- Consumes: `supabase` client; `MoodValue` type from
  `web/src/types/intercepta.ts` (existing).
- Produces (for Task 4 and 5): types `EngagementEventType =
  'intercepta_mission' | 'activity_answer'`, `MoodStat { classId: string;
  day: string; mood: MoodValue; studentCount: number }`, `EngagementStat {
  classId: string; day: string; eventType: EngagementEventType;
  studentCount: number }`; hook `useSchoolStats(): { moodStats: MoodStat[];
  engagementStats: EngagementStat[]; loading: boolean; refetch: () =>
  Promise<void> }`.

- [ ] **Step 1: Write the types**

```ts
// web/src/types/escola.ts
import type { MoodValue } from './intercepta';

export interface MoodStat {
  classId: string;
  day: string;
  mood: MoodValue;
  studentCount: number;
}

export type EngagementEventType = 'intercepta_mission' | 'activity_answer';

export interface EngagementStat {
  classId: string;
  day: string;
  eventType: EngagementEventType;
  studentCount: number;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// web/src/hooks/useSchoolStats.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSchoolStats } from './useSchoolStats';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const moodBuilder = chainable({
  data: [{ class_id: 'class-1', day: '2026-09-10', mood: 'bem', student_count: 4 }],
  error: null,
});
const engagementBuilder = chainable({
  data: [{ class_id: 'class-1', day: '2026-09-10', event_type: 'intercepta_mission', student_count: 5 }],
  error: null,
});

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'school_mood_stats':
      return moodBuilder;
    case 'school_engagement_stats':
      return engagementBuilder;
    default:
      throw new Error(`unexpected table ${table}`);
  }
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

describe('useSchoolStats', () => {
  it('loads aggregated mood and engagement stats', async () => {
    const { result } = renderHook(() => useSchoolStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.moodStats).toEqual([
      { classId: 'class-1', day: '2026-09-10', mood: 'bem', studentCount: 4 },
    ]);
    expect(result.current.engagementStats).toEqual([
      { classId: 'class-1', day: '2026-09-10', eventType: 'intercepta_mission', studentCount: 5 },
    ]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useSchoolStats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the hook**

```ts
// web/src/hooks/useSchoolStats.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodValue } from '../types/intercepta';
import type { EngagementEventType, EngagementStat, MoodStat } from '../types/escola';

interface MoodStatRow {
  class_id: string;
  day: string;
  mood: MoodValue;
  student_count: number;
}

interface EngagementStatRow {
  class_id: string;
  day: string;
  event_type: EngagementEventType;
  student_count: number;
}

interface UseSchoolStatsResult {
  moodStats: MoodStat[];
  engagementStats: EngagementStat[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useSchoolStats(): UseSchoolStatsResult {
  const [moodStats, setMoodStats] = useState<MoodStat[]>([]);
  const [engagementStats, setEngagementStats] = useState<EngagementStat[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const [moodResult, engagementResult] = await Promise.all([
      supabase.from('school_mood_stats').select('class_id, day, mood, student_count').order('day'),
      supabase.from('school_engagement_stats').select('class_id, day, event_type, student_count').order('day'),
    ]);

    const moodRows = (moodResult.data ?? []) as MoodStatRow[];
    setMoodStats(
      moodRows.map((row) => ({
        classId: row.class_id,
        day: row.day,
        mood: row.mood,
        studentCount: row.student_count,
      })),
    );

    const engagementRows = (engagementResult.data ?? []) as EngagementStatRow[];
    setEngagementStats(
      engagementRows.map((row) => ({
        classId: row.class_id,
        day: row.day,
        eventType: row.event_type,
        studentCount: row.student_count,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { moodStats, engagementStats, loading, refetch };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useSchoolStats.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/types/escola.ts web/src/hooks/useSchoolStats.ts web/src/hooks/useSchoolStats.test.ts
git commit -m "feat: add useSchoolStats hook"
```

---

## Task 4: `EscolaDashboard` component

**Files:**
- Create: `web/src/components/EscolaDashboard.tsx`
- Test: `web/src/components/EscolaDashboard.test.tsx`

**Interfaces:**
- Consumes: `EngagementStat`, `MoodStat` types from Task 3;
  `MoodValue` from `web/src/types/intercepta.ts`.
- Produces (for Task 5): `<EscolaDashboard moodStats={MoodStat[]}
  engagementStats={EngagementStat[]} loading={boolean} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/EscolaDashboard.test.tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EscolaDashboard } from './EscolaDashboard';

describe('EscolaDashboard', () => {
  it('shows the empty state when no group meets the k-anonymity threshold', () => {
    render(<EscolaDashboard moodStats={[]} engagementStats={[]} loading={false} />);
    expect(screen.getByText(/Sem dados suficientes/)).toBeInTheDocument();
  });

  it('renders aggregated mood and engagement totals', () => {
    render(
      <EscolaDashboard
        moodStats={[
          { classId: 'class-1', day: '2026-09-10', mood: 'bem', studentCount: 4 },
          { classId: 'class-1', day: '2026-09-11', mood: 'bem', studentCount: 3 },
        ]}
        engagementStats={[
          { classId: 'class-1', day: '2026-09-10', eventType: 'intercepta_mission', studentCount: 5 },
        ]}
        loading={false}
      />,
    );

    expect(screen.getByText('7 alunos')).toBeInTheDocument();
    expect(screen.getByText('Trocas de impulso por estudo')).toBeInTheDocument();
    expect(screen.getByText('5 alunos')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/EscolaDashboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// web/src/components/EscolaDashboard.tsx
import type { EngagementStat, MoodStat } from '../types/escola';
import type { MoodValue } from '../types/intercepta';

const MOOD_EMOJI: Record<MoodValue, string> = {
  muito_mal: '😞',
  mal: '😕',
  neutro: '😐',
  bem: '🙂',
  muito_bem: '😄',
};

const ENGAGEMENT_LABEL = {
  intercepta_mission: 'Trocas de impulso por estudo',
  activity_answer: 'Participação em Modo Aula',
} as const;

interface EscolaDashboardProps {
  moodStats: MoodStat[];
  engagementStats: EngagementStat[];
  loading: boolean;
}

function sumBy<T, K extends string>(rows: T[], keyOf: (row: T) => K, valueOf: (row: T) => number): Record<K, number> {
  const totals = {} as Record<K, number>;
  for (const row of rows) {
    const key = keyOf(row);
    totals[key] = (totals[key] ?? 0) + valueOf(row);
  }
  return totals;
}

export function EscolaDashboard({ moodStats, engagementStats, loading }: EscolaDashboardProps) {
  if (loading) return null;

  if (moodStats.length === 0 && engagementStats.length === 0) {
    return (
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Sinais da turma</h2>
        <p className="mt-2 text-sm text-ink-500">
          Sem dados suficientes ainda pra exibir com segurança (esperando pelo menos 3 alunos por grupo).
        </p>
      </section>
    );
  }

  const moodTotals = sumBy(
    moodStats,
    (row) => row.mood,
    (row) => row.studentCount,
  );
  const engagementTotals = sumBy(
    engagementStats,
    (row) => row.eventType,
    (row) => row.studentCount,
  );
  const maxMoodTotal = Math.max(1, ...Object.values(moodTotals));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Humor agregado da turma</h2>
        <ul className="mt-3 space-y-2">
          {(Object.keys(MOOD_EMOJI) as MoodValue[])
            .filter((mood) => moodTotals[mood])
            .map((mood) => {
              const count = moodTotals[mood] ?? 0;
              const pct = Math.round((count / maxMoodTotal) * 100);
              return (
                <li key={mood}>
                  <div className="flex justify-between text-xs font-medium text-ink-700">
                    <span>
                      {MOOD_EMOJI[mood]} {mood.replace('_', ' ')}
                    </span>
                    <span>{count} alunos</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-canvas">
                    <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="rounded-2xl border border-line-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-700">Engajamento da turma</h2>
        <ul className="mt-3 space-y-2">
          {(Object.keys(ENGAGEMENT_LABEL) as (keyof typeof ENGAGEMENT_LABEL)[])
            .filter((type) => engagementTotals[type])
            .map((type) => (
              <li key={type} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{ENGAGEMENT_LABEL[type]}</span>
                <span className="font-medium text-ink-700">{engagementTotals[type]} alunos</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/EscolaDashboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/EscolaDashboard.tsx web/src/components/EscolaDashboard.test.tsx
git commit -m "feat: add EscolaDashboard component"
```

---

## Task 5: Compose `EscolaHome`

**Files:**
- Modify: `web/src/pages/EscolaHome.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `LogoutButton` (existing, already wired in the
  current file); `useSchoolStats` (Task 3); `EscolaDashboard` (Task 4).
- Produces: the real `/escola` page rendered by `App.tsx`'s existing
  route (no route change needed).

No new unit test — pure composition; correctness checked by the manual
smoke test below. Read the current file first — it already has a header
with `LogoutButton` wired in from earlier work; keep that, only replace
the `<p>Área da escola</p>` placeholder body.

- [ ] **Step 1: Implement the page**

```tsx
// web/src/pages/EscolaHome.tsx
import { useAuthStore } from '../store/useAuthStore';
import { LogoutButton } from '../components/LogoutButton';
import { useSchoolStats } from '../hooks/useSchoolStats';
import { EscolaDashboard } from '../components/EscolaDashboard';

export function EscolaHome() {
  const user = useAuthStore((s) => s.user);
  const { moodStats, engagementStats, loading } = useSchoolStats();

  return (
    <div className="min-h-svh bg-canvas pb-safe">
      <header className="sticky top-0 z-10 border-b border-line-200 bg-canvas/95 pt-safe backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs text-ink-500">Olá,</p>
            <h1 className="text-base font-semibold text-ink-700">{user?.name}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-4 sm:p-6">
        <EscolaDashboard moodStats={moodStats} engagementStats={engagementStats} loading={loading} />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Full test suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 3: End-to-end smoke check against Supabase Cloud**

No browser tool available in this environment — verify via REST instead
(same technique used in the Modo Aula plan's Task 8 smoke check):
1. Log in as `coordenacao@demo.foco` / `demo1234` via
   `POST $VITE_SUPABASE_URL/auth/v1/token?grant_type=password`.
2. `GET $VITE_SUPABASE_URL/rest/v1/school_mood_stats?select=*` and
   `GET $VITE_SUPABASE_URL/rest/v1/school_engagement_stats?select=*` with
   that token.
3. Log in as `aluno1@demo.foco` and repeat step 2 with the student's
   token.

Expected: `coordenacao@demo.foco` gets `200` (an array — possibly empty if
no group yet has 3+ distinct students, which is expected with only 5 demo
students and sparse seeded events); `aluno1@demo.foco` gets an empty array
too (blocked by the view's own `role = 'school_admin'` check, not a 403 —
PostgREST returns 200 with `[]` for a view that filters everything out via
its `WHERE`, since the caller isn't the same person the RLS-free `WHERE
u.school_id = (select school_id from users where id = auth.uid())` and
`exists (... role = 'school_admin')` clauses check for). Confirm the
student's response is `[]`, never another school's or another role's
aggregated rows.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/EscolaHome.tsx
git commit -m "feat: wire EscolaHome to aggregated k-anonymous school stats"
```

---

## Self-Review Notes

- **Spec coverage:** "Schema — buraco encontrado" → Task 1; "Views
  agregadas" → Task 2; `types/escola.ts` + `useSchoolStats` → Task 3;
  `EscolaDashboard` → Task 4; page composition → Task 5. "Fora de escopo"
  items (date-range picker, chart library, multi-class enrollment) are
  explicitly not built anywhere in this plan.
- **Placeholder scan:** none — every step has runnable code or a concrete
  command with expected output.
- **Type consistency:** `MoodStat`/`EngagementStat`/`EngagementEventType`
  (Task 3) match exactly what Task 4's `EscolaDashboardProps` and Task 5's
  `useSchoolStats()` destructuring use; `MoodValue` reused unchanged from
  `web/src/types/intercepta.ts` rather than redefined.
