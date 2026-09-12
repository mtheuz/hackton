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
