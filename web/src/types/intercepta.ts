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
