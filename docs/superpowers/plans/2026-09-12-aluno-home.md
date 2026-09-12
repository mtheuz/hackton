# AlunoHome (Intercepta + Raio-X) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `AlunoHome` placeholder with a working Intercepta
(micro-missão de 3-5min) + Raio-X privado (humor + progresso) flow, wired to
the real Supabase Cloud schema and RLS that already exist.

**Architecture:** React talks directly to Supabase (`@supabase/supabase-js`,
anon key), same pattern as `LoginPage`/`useAuthStore` — no Go API involved for
this page. Three small hooks (`useInterceptaMission`, `useDomainProgress`,
`useMoodCheckins`) each own one table's read/write + Realtime subscription;
two presentational components (`InterceptaCard`, `CheckinHumor`) render what
the hooks give them and forward user actions back up. `AlunoHome` composes
the three hooks and two components.

**Tech Stack:** React 19, TypeScript, `@supabase/supabase-js`, Zustand
(`useAuthStore`, already implemented), Vitest + Testing Library, Tailwind.

**Spec:** `docs/superpowers/specs/2026-09-12-aluno-home-design.md`

## Global Constraints

- Placar **nunca** mostra tempo logado/tempo de tela — só contagem de
  "Trocas de impulso por estudo" (missões `intercepta_missions` com
  `completed_at` preenchido) (AGENTS.md §2.A, spec "Placar — regra de ouro").
- Tipagem estrita: proibido `any` em qualquer arquivo novo (AGENTS.md §6.B).
- Nenhuma tabela nova, nenhuma policy de RLS nova — o schema de
  `00001_initial_schema.sql`/`00002_extensions.sql`/`00003_rls_policies.sql`
  já cobre tudo que esta página precisa (spec "Dados", "RLS").
- Este projeto usa **Supabase Cloud**, não Docker local. Ler `DATABASE_URL`
  de `.env` (raiz do repo) para aplicar a migration nova; `npx supabase db
  push`/`db reset` têm bug confirmado com `%40` na senha — usar `npx supabase
  db query --db-url "$DATABASE_URL" --file <path>` (documentado em
  `docs/superpowers/plans/2026-09-11-fundacao.md`).
- Botão "Simular impulso" é rotulado como demo — substitui o motor de
  detecção de impulso, que está fora de escopo (spec "Fora de escopo").

---

## Task 1: Seed do banco de conteúdo do Intercepta

**Files:**
- Create: `supabase/migrations/00005_seed_intercepta_content.sql`

**Interfaces:**
- Consumes: `sessions`, `activities`, `intercepta_missions` tables and the
  demo class (`classes.id = '44444444-4444-4444-4444-444444444444'`,
  `teacher_id = '11111111-1111-1111-1111-111111111111'`) from
  `00004_seed_demo.sql`.
- Produces: 3 quiz `activities` (ids `66666666-...661/662/663`) whose
  `content_json` shape — `{ subject, question, options[], correct_index,
  pf_reward }` — every later task's `MissionActivityContent` type matches
  exactly; 1 pending `intercepta_missions` row for
  `aluno1@demo.foco` (`22222222-2222-2222-2222-222222222221`) pointing at
  activity `66666666-...661`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/00005_seed_intercepta_content.sql

-- "Banco" session: container for Intercepta content, not a live Modo Aula
-- session (activities.session_id is not null, so it needs somewhere to live).
insert into sessions (id, class_id, teacher_id, code, status) values
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'BANCO1',
    'finished'
  );

insert into activities (id, session_id, type, content_json) values
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"matematica","question":"Quanto é 7 x 8?","options":["54","56","58","64"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"portugues","question":"Qual é o plural de \"cidadão\"?","options":["cidadões","cidadãos","cidadães","cidadão"],"correct_index":1,"pf_reward":10}'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    '55555555-5555-5555-5555-555555555555',
    'quiz',
    '{"subject":"ciencias","question":"Qual gás as plantas absorvem na fotossíntese?","options":["Oxigênio","Nitrogênio","Gás carbônico","Hidrogênio"],"correct_index":2,"pf_reward":10}'
  );

insert into intercepta_missions (id, student_id, activity_id, trigger_time) values
  (
    '77777777-7777-7777-7777-777777777771',
    '22222222-2222-2222-2222-222222222221',
    '66666666-6666-6666-6666-666666666661',
    now()
  );
```

- [ ] **Step 2: Apply the migration to Supabase Cloud**

Run: `npx supabase db query --db-url "$DATABASE_URL" --file supabase/migrations/00005_seed_intercepta_content.sql`
Expected: no errors.

- [ ] **Step 3: Verify the seed**

Run: `npx supabase db query --db-url "$DATABASE_URL" --file - <<< "select count(*) from activities where type = 'quiz'; select count(*) from intercepta_missions where completed_at is null;"`
Expected: `3` and `1`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00005_seed_intercepta_content.sql
git commit -m "feat: seed Intercepta content bank and one pending demo mission"
```

---

## Task 2: `useInterceptaMission` hook

**Files:**
- Create: `web/src/types/intercepta.ts`
- Create: `web/src/hooks/useInterceptaMission.ts`
- Test: `web/src/hooks/useInterceptaMission.test.ts`

**Interfaces:**
- Consumes: `supabase` client from `web/src/services/supabaseClient.ts`.
- Produces (for Tasks 5 and 7): types `MissionActivityContent { subject:
  string; question: string; options: string[]; correct_index: number;
  pf_reward: number }`, `PendingMission { missionId: string; activityId:
  string; content: MissionActivityContent }`; hook
  `useInterceptaMission(studentId: string): { mission: PendingMission |
  null; completedCount: number; loading: boolean; completeMission:
  (selectedIndex: number) => Promise<void>; simulateImpulse: () =>
  Promise<void> }`.

- [ ] **Step 1: Write the types**

```ts
// web/src/types/intercepta.ts
export interface MissionActivityContent {
  subject: string;
  question: string;
  options: string[];
  correct_index: number;
  pf_reward: number;
}

export interface PendingMission {
  missionId: string;
  activityId: string;
  content: MissionActivityContent;
}

export interface DomainProgress {
  subject: string;
  level: number;
  pfAccumulated: number;
}

export type MoodValue = 'muito_mal' | 'mal' | 'neutro' | 'bem' | 'muito_bem';

export interface MoodCheckin {
  id: string;
  mood: MoodValue;
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// web/src/hooks/useInterceptaMission.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useInterceptaMission } from './useInterceptaMission';

const missionRow = {
  id: 'mission-1',
  activity_id: 'activity-1',
  completed_at: null,
  activities: {
    content_json: {
      subject: 'matematica',
      question: 'Quanto é 7 x 8?',
      options: ['54', '56', '58', '64'],
      correct_index: 1,
      pf_reward: 10,
    },
  },
};

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const interceptaBuilder = chainable({ data: [missionRow], error: null });
const studentEventsBuilder = chainable({ data: null, error: null });
const domainProgressBuilder = chainable({ data: null, error: null });
const activitiesBuilder = chainable({ data: [{ id: 'activity-2' }], error: null });

const fromMock = vi.fn((table: string) => {
  switch (table) {
    case 'intercepta_missions':
      return interceptaBuilder;
    case 'student_events':
      return studentEventsBuilder;
    case 'domain_progress':
      return domainProgressBuilder;
    case 'activities':
      return activitiesBuilder;
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

describe('useInterceptaMission', () => {
  beforeEach(() => {
    fromMock.mockClear();
    (interceptaBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
    (interceptaBuilder.update as ReturnType<typeof vi.fn>).mockClear();
    (studentEventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
    (domainProgressBuilder.upsert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('loads the pending mission for the student', async () => {
    const { result } = renderHook(() => useInterceptaMission('student-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.mission).toEqual({
      missionId: 'mission-1',
      activityId: 'activity-1',
      content: missionRow.activities.content_json,
    });
    expect(result.current.completedCount).toBe(0);
  });

  it('records the answer, closes the mission and grants PF', async () => {
    const { result } = renderHook(() => useInterceptaMission('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.completeMission(1);
    });

    expect(studentEventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: null,
      event_type: 'intercepta_mission',
      payload_json: { activity_id: 'activity-1', selected_index: 1, correct: true },
      pf_earned: 10,
    });
    expect(interceptaBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ completed_at: expect.any(String) }),
    );
    expect(domainProgressBuilder.upsert).toHaveBeenCalledWith({
      student_id: 'student-1',
      subject: 'matematica',
      level: 1,
      pf_accumulated: 10,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useInterceptaMission.test.ts`
Expected: FAIL — `useInterceptaMission` module not found.

- [ ] **Step 4: Implement the hook**

```ts
// web/src/hooks/useInterceptaMission.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MissionActivityContent, PendingMission } from '../types/intercepta';

interface MissionRow {
  id: string;
  activity_id: string;
  completed_at: string | null;
  activities: { content_json: MissionActivityContent } | null;
}

interface UseInterceptaMissionResult {
  mission: PendingMission | null;
  completedCount: number;
  loading: boolean;
  completeMission: (selectedIndex: number) => Promise<void>;
  simulateImpulse: () => Promise<void>;
}

export function useInterceptaMission(studentId: string): UseInterceptaMissionResult {
  const [mission, setMission] = useState<PendingMission | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setMission(null);
      setCompletedCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await supabase
      .from('intercepta_missions')
      .select('id, activity_id, completed_at, activities(content_json)')
      .eq('student_id', studentId)
      .order('trigger_time', { ascending: true });

    const rows = (data ?? []) as unknown as MissionRow[];
    const pending = rows.find((row) => !row.completed_at) ?? null;

    setMission(
      pending && pending.activities
        ? { missionId: pending.id, activityId: pending.activity_id, content: pending.activities.content_json }
        : null,
    );
    setCompletedCount(rows.filter((row) => row.completed_at).length);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
    if (!studentId) return;

    const channel = supabase
      .channel(`intercepta-missions-${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'intercepta_missions', filter: `student_id=eq.${studentId}` },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, refetch]);

  const completeMission = useCallback(
    async (selectedIndex: number) => {
      if (!mission) return;
      const correct = selectedIndex === mission.content.correct_index;
      const pfEarned = mission.content.pf_reward;

      const { error: eventError } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: null,
        event_type: 'intercepta_mission',
        payload_json: { activity_id: mission.activityId, selected_index: selectedIndex, correct },
        pf_earned: pfEarned,
      });
      if (eventError) throw eventError;

      const { error: missionError } = await supabase
        .from('intercepta_missions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', mission.missionId)
        .eq('student_id', studentId);
      if (missionError) throw missionError;

      const { data: existing } = await supabase
        .from('domain_progress')
        .select('level, pf_accumulated')
        .eq('student_id', studentId)
        .eq('subject', mission.content.subject)
        .maybeSingle<{ level: number; pf_accumulated: number }>();

      const { error: progressError } = await supabase.from('domain_progress').upsert({
        student_id: studentId,
        subject: mission.content.subject,
        level: existing?.level ?? 1,
        pf_accumulated: (existing?.pf_accumulated ?? 0) + pfEarned,
      });
      if (progressError) throw progressError;

      await refetch();
    },
    [mission, studentId, refetch],
  );

  const simulateImpulse = useCallback(async () => {
    if (!studentId) return;
    const { data } = await supabase.from('activities').select('id').eq('type', 'quiz');
    const activities = (data ?? []) as { id: string }[];
    if (activities.length === 0) return;

    const chosen = activities[Math.floor(Math.random() * activities.length)];
    const { error } = await supabase.from('intercepta_missions').insert({
      student_id: studentId,
      activity_id: chosen.id,
      trigger_time: new Date().toISOString(),
    });
    if (error) throw error;
    await refetch();
  }, [studentId, refetch]);

  return { mission, completedCount, loading, completeMission, simulateImpulse };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useInterceptaMission.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/types/intercepta.ts web/src/hooks/useInterceptaMission.ts web/src/hooks/useInterceptaMission.test.ts
git commit -m "feat: add useInterceptaMission hook (fetch, answer, simulate impulse)"
```

---

## Task 3: `useDomainProgress` hook

**Files:**
- Create: `web/src/hooks/useDomainProgress.ts`
- Test: `web/src/hooks/useDomainProgress.test.ts`

**Interfaces:**
- Consumes: `DomainProgress` type from Task 2's `web/src/types/intercepta.ts`.
- Produces (for Task 7): `useDomainProgress(studentId: string): { progress:
  DomainProgress[]; loading: boolean }`.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/hooks/useDomainProgress.test.ts
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDomainProgress } from './useDomainProgress';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const progressBuilder = chainable({
  data: [{ subject: 'matematica', level: 2, pf_accumulated: 30 }],
  error: null,
});

const channelMock = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => progressBuilder),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

describe('useDomainProgress', () => {
  it('loads the progress rows for the student', async () => {
    const { result } = renderHook(() => useDomainProgress('student-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.progress).toEqual([{ subject: 'matematica', level: 2, pfAccumulated: 30 }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useDomainProgress.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// web/src/hooks/useDomainProgress.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { DomainProgress } from '../types/intercepta';

interface ProgressRow {
  subject: string;
  level: number;
  pf_accumulated: number;
}

export function useDomainProgress(studentId: string): { progress: DomainProgress[]; loading: boolean } {
  const [progress, setProgress] = useState<DomainProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setProgress([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('domain_progress')
      .select('subject, level, pf_accumulated')
      .eq('student_id', studentId)
      .order('subject');

    const rows = (data ?? []) as ProgressRow[];
    setProgress(rows.map((row) => ({ subject: row.subject, level: row.level, pfAccumulated: row.pf_accumulated })));
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refetch();
    if (!studentId) return;

    const channel = supabase
      .channel(`domain-progress-${studentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'domain_progress', filter: `student_id=eq.${studentId}` },
        () => void refetch(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [studentId, refetch]);

  return { progress, loading };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useDomainProgress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useDomainProgress.ts web/src/hooks/useDomainProgress.test.ts
git commit -m "feat: add useDomainProgress hook"
```

---

## Task 4: `useMoodCheckins` hook

**Files:**
- Create: `web/src/hooks/useMoodCheckins.ts`
- Test: `web/src/hooks/useMoodCheckins.test.ts`

**Interfaces:**
- Consumes: `MoodCheckin`, `MoodValue` types from Task 2's
  `web/src/types/intercepta.ts`.
- Produces (for Task 6 and Task 7): `useMoodCheckins(studentId: string): {
  recentMoods: MoodCheckin[]; checkin: (mood: MoodValue) => Promise<void> }`.

- [ ] **Step 1: Write the failing test**

```ts
// web/src/hooks/useMoodCheckins.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMoodCheckins } from './useMoodCheckins';

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    then: (resolve: (v: typeof result) => void) => resolve(result),
  };
  return builder;
}

const eventsBuilder = chainable({
  data: [{ id: 'evt-1', created_at: '2026-09-12T10:00:00Z', payload_json: { mood: 'bem' } }],
  error: null,
});

vi.mock('../services/supabaseClient', () => ({
  supabase: { from: vi.fn(() => eventsBuilder) },
}));

describe('useMoodCheckins', () => {
  beforeEach(() => {
    (eventsBuilder.insert as ReturnType<typeof vi.fn>).mockClear();
  });

  it('loads recent mood checkins on mount', async () => {
    const { result } = renderHook(() => useMoodCheckins('student-1'));

    await waitFor(() =>
      expect(result.current.recentMoods).toEqual([{ id: 'evt-1', mood: 'bem', createdAt: '2026-09-12T10:00:00Z' }]),
    );
  });

  it('checkin() inserts a checkin_humor event with the chosen mood', async () => {
    const { result } = renderHook(() => useMoodCheckins('student-1'));
    await waitFor(() => expect(result.current.recentMoods.length).toBe(1));

    await act(async () => {
      await result.current.checkin('muito_bem');
    });

    expect(eventsBuilder.insert).toHaveBeenCalledWith({
      student_id: 'student-1',
      session_id: null,
      event_type: 'checkin_humor',
      payload_json: { mood: 'muito_bem' },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/hooks/useMoodCheckins.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// web/src/hooks/useMoodCheckins.ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { MoodCheckin, MoodValue } from '../types/intercepta';

interface CheckinRow {
  id: string;
  created_at: string;
  payload_json: { mood: MoodValue };
}

export function useMoodCheckins(studentId: string): {
  recentMoods: MoodCheckin[];
  checkin: (mood: MoodValue) => Promise<void>;
} {
  const [recentMoods, setRecentMoods] = useState<MoodCheckin[]>([]);

  const refetch = useCallback(async () => {
    if (!studentId) {
      setRecentMoods([]);
      return;
    }
    const { data } = await supabase
      .from('student_events')
      .select('id, created_at, payload_json')
      .eq('student_id', studentId)
      .eq('event_type', 'checkin_humor')
      .order('created_at', { ascending: false })
      .limit(5);

    const rows = (data ?? []) as CheckinRow[];
    setRecentMoods(rows.map((row) => ({ id: row.id, mood: row.payload_json.mood, createdAt: row.created_at })));
  }, [studentId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const checkin = useCallback(
    async (mood: MoodValue) => {
      if (!studentId) return;
      const { error } = await supabase.from('student_events').insert({
        student_id: studentId,
        session_id: null,
        event_type: 'checkin_humor',
        payload_json: { mood },
      });
      if (error) throw error;
      await refetch();
    },
    [studentId, refetch],
  );

  return { recentMoods, checkin };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/hooks/useMoodCheckins.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useMoodCheckins.ts web/src/hooks/useMoodCheckins.test.ts
git commit -m "feat: add useMoodCheckins hook"
```

---

## Task 5: `InterceptaCard` component

**Files:**
- Create: `web/src/components/InterceptaCard.tsx`
- Test: `web/src/components/InterceptaCard.test.tsx`

**Interfaces:**
- Consumes: `PendingMission` type from Task 2.
- Produces (for Task 7): `<InterceptaCard mission={PendingMission | null}
  completedCount={number} onAnswer={(selectedIndex: number) =>
  Promise<void>} onSimulateImpulse={() => Promise<void>} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/InterceptaCard.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InterceptaCard } from './InterceptaCard';
import type { PendingMission } from '../types/intercepta';

const mission: PendingMission = {
  missionId: 'mission-1',
  activityId: 'activity-1',
  content: {
    subject: 'matematica',
    question: 'Quanto é 7 x 8?',
    options: ['54', '56'],
    correct_index: 1,
    pf_reward: 10,
  },
};

describe('InterceptaCard', () => {
  it('answers the mission and disables the options', async () => {
    const onAnswer = vi.fn().mockResolvedValue(undefined);
    render(<InterceptaCard mission={mission} completedCount={0} onAnswer={onAnswer} onSimulateImpulse={vi.fn()} />);

    fireEvent.click(screen.getByText('56'));

    expect(onAnswer).toHaveBeenCalledWith(1);
    await waitFor(() => expect(screen.getByText('56')).toBeDisabled());
  });

  it('shows the simulate button and placar when there is no pending mission', () => {
    const onSimulateImpulse = vi.fn().mockResolvedValue(undefined);
    render(<InterceptaCard mission={null} completedCount={3} onAnswer={vi.fn()} onSimulateImpulse={onSimulateImpulse} />);

    expect(screen.getByText(/Trocas de impulso por estudo: 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Simular impulso (demo)'));
    expect(onSimulateImpulse).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/InterceptaCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// web/src/components/InterceptaCard.tsx
import { useState } from 'react';
import type { PendingMission } from '../types/intercepta';

interface InterceptaCardProps {
  mission: PendingMission | null;
  completedCount: number;
  onAnswer: (selectedIndex: number) => Promise<void>;
  onSimulateImpulse: () => Promise<void>;
}

export function InterceptaCard({ mission, completedCount, onAnswer, onSimulateImpulse }: InterceptaCardProps) {
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAnswer(index: number) {
    setAnswered(true);
    setSubmitting(true);
    try {
      await onAnswer(index);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSimulate() {
    setSubmitting(true);
    try {
      await onSimulateImpulse();
    } finally {
      setSubmitting(false);
    }
  }

  if (!mission) {
    return (
      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
        <p className="text-sm text-[#615d59]">Sem missão agora. Trocas de impulso por estudo: {completedCount}</p>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSimulate()}
          className="mt-3 rounded-full bg-[#0E5A96] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Simular impulso (demo)
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase text-[#0E5A96]">{mission.content.subject}</p>
      <p className="mt-1 text-sm font-medium text-[#31302e]">{mission.content.question}</p>
      <div className="mt-3 flex flex-col gap-2">
        {mission.content.options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answered || submitting}
            onClick={() => void handleAnswer(index)}
            className="rounded-lg border border-[#dddddd] px-3 py-2 text-left text-sm disabled:opacity-50"
          >
            {option}
          </button>
        ))}
      </div>
      {answered && <p className="mt-3 text-xs text-[#615d59]">Valeu por trocar a rede social pelo estudo!</p>}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/InterceptaCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/InterceptaCard.tsx web/src/components/InterceptaCard.test.tsx
git commit -m "feat: add InterceptaCard component"
```

---

## Task 6: `CheckinHumor` component

**Files:**
- Create: `web/src/components/CheckinHumor.tsx`
- Test: `web/src/components/CheckinHumor.test.tsx`

**Interfaces:**
- Consumes: `MoodCheckin`, `MoodValue` types from Task 2.
- Produces (for Task 7): `<CheckinHumor recentMoods={MoodCheckin[]}
  onCheckin={(mood: MoodValue) => void} />`.

- [ ] **Step 1: Write the failing test**

```tsx
// web/src/components/CheckinHumor.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckinHumor } from './CheckinHumor';

describe('CheckinHumor', () => {
  it('calls onCheckin with the selected mood', () => {
    const onCheckin = vi.fn();
    render(<CheckinHumor recentMoods={[]} onCheckin={onCheckin} />);

    fireEvent.click(screen.getByLabelText('Muito bem'));

    expect(onCheckin).toHaveBeenCalledWith('muito_bem');
  });

  it('renders the recent mood history as emoji', () => {
    render(
      <CheckinHumor
        recentMoods={[{ id: 'evt-1', mood: 'bem', createdAt: '2026-09-12T10:00:00Z' }]}
        onCheckin={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Histórico recente de humor')).toHaveTextContent('🙂');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run src/components/CheckinHumor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// web/src/components/CheckinHumor.tsx
import type { MoodCheckin, MoodValue } from '../types/intercepta';

const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 'muito_mal', emoji: '😞', label: 'Muito mal' },
  { value: 'mal', emoji: '😕', label: 'Mal' },
  { value: 'neutro', emoji: '😐', label: 'Neutro' },
  { value: 'bem', emoji: '🙂', label: 'Bem' },
  { value: 'muito_bem', emoji: '😄', label: 'Muito bem' },
];

interface CheckinHumorProps {
  recentMoods: MoodCheckin[];
  onCheckin: (mood: MoodValue) => void;
}

export function CheckinHumor({ recentMoods, onCheckin }: CheckinHumorProps) {
  return (
    <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-[#31302e]">Como você está agora?</h2>
      <div className="mt-3 flex justify-between">
        {MOODS.map((mood) => (
          <button
            key={mood.value}
            type="button"
            aria-label={mood.label}
            onClick={() => onCheckin(mood.value)}
            className="text-2xl transition-transform hover:scale-110"
          >
            {mood.emoji}
          </button>
        ))}
      </div>
      {recentMoods.length > 0 && (
        <div className="mt-4 flex gap-1 text-lg" aria-label="Histórico recente de humor">
          {recentMoods.map((entry) => (
            <span key={entry.id}>{MOODS.find((m) => m.value === entry.mood)?.emoji}</span>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && npx vitest run src/components/CheckinHumor.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/components/CheckinHumor.tsx web/src/components/CheckinHumor.test.tsx
git commit -m "feat: add CheckinHumor component"
```

---

## Task 7: Compose `AlunoHome`

**Files:**
- Modify: `web/src/pages/AlunoHome.tsx`

**Interfaces:**
- Consumes: `useAuthStore` (existing), `useInterceptaMission` (Task 2),
  `useDomainProgress` (Task 3), `useMoodCheckins` (Task 4), `InterceptaCard`
  (Task 5), `CheckinHumor` (Task 6).
- Produces: the real `/aluno` page rendered by `App.tsx`'s existing route
  (no route change needed).

No new unit test here — this task is pure composition of already-tested
hooks/components; correctness is checked by the manual smoke test below.

- [ ] **Step 1: Implement the page**

```tsx
// web/src/pages/AlunoHome.tsx
import { useAuthStore } from '../store/useAuthStore';
import { useInterceptaMission } from '../hooks/useInterceptaMission';
import { useDomainProgress } from '../hooks/useDomainProgress';
import { useMoodCheckins } from '../hooks/useMoodCheckins';
import { InterceptaCard } from '../components/InterceptaCard';
import { CheckinHumor } from '../components/CheckinHumor';

export function AlunoHome() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? '';

  const { mission, completedCount, completeMission, simulateImpulse } = useInterceptaMission(studentId);
  const { progress } = useDomainProgress(studentId);
  const { recentMoods, checkin } = useMoodCheckins(studentId);

  if (!user) return null;

  return (
    <div className="min-h-svh space-y-4 bg-[#f6f5f4] p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-[#31302e]">Olá, {user.name}</h1>

      <CheckinHumor recentMoods={recentMoods} onCheckin={checkin} />

      <InterceptaCard
        mission={mission}
        completedCount={completedCount}
        onAnswer={completeMission}
        onSimulateImpulse={simulateImpulse}
      />

      <section className="rounded-2xl border border-[#e6e6e6] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#31302e]">Seu progresso</h2>
        {progress.length === 0 ? (
          <p className="mt-2 text-sm text-[#615d59]">Ainda sem progresso registrado.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {progress.map((p) => (
              <li key={p.subject} className="flex items-center justify-between text-sm">
                <span className="capitalize text-[#31302e]">{p.subject}</span>
                <span className="text-[#615d59]">
                  Nível {p.level} · {p.pfAccumulated} PF
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Full test suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Step 3: Manual smoke check**

Run: `cd web && npm run dev`, log in as `aluno1@demo.foco` / `demo1234`,
land on `/aluno`.
Expected: check-in de humor clicável (histórico aparece após clique);
missão "Quanto é 7 x 8?" aparece com 4 opções; clicar numa opção desabilita
os botões e mostra a mensagem de reforço; "Seu progresso" mostra
`matematica · Nível 1 · 10 PF` depois de responder; se não houver missão
pendente, botão "Simular impulso (demo)" cria uma nova.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/AlunoHome.tsx
git commit -m "feat: wire AlunoHome to Intercepta missions and Raio-X privado"
```

---

## Self-Review Notes

- **Spec coverage:** "Dados"/seed → Task 1; `types/intercepta.ts` +
  `useInterceptaMission` → Task 2; `useDomainProgress` → Task 3;
  `useMoodCheckins` + "Raio-X privado" → Task 4; `InterceptaCard` → Task 5;
  `CheckinHumor` → Task 6; composition + placar "Trocas de impulso" rule →
  Task 7. "Botão demo" requirement → Task 2's `simulateImpulse` +
  Task 5's no-mission branch. "RLS" section → no task needed, explicitly
  called out as unchanged in Global Constraints.
- **Placeholder scan:** none — every step has runnable code or a concrete
  command with expected output.
- **Type consistency:** `PendingMission`/`MissionActivityContent` (Task 2)
  used identically in Task 5's `InterceptaCardProps`; `DomainProgress`
  (Task 2) matches Task 3's return type and Task 7's `progress.map` usage
  (`pfAccumulated`, not `pf_accumulated`, outside the hook); `MoodCheckin`/
  `MoodValue` (Task 2) match Task 4's return type and Task 6's props.
