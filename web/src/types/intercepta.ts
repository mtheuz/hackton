export interface MissionActivityContent {
  subject: string;
  question: string;
  options?: string[];
  correct_index: number;
  pf_reward: number;
  answer_type?: 'multiple_choice' | 'open';
  attachment_allowed?: boolean;
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

export interface MoodPerformanceBucket {
  mood: MoodValue;
  accuracy: number;
  sampleSize: number;
}
