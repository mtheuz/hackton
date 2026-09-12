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
