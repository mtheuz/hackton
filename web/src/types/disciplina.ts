export interface Discipline {
  id: string;
  name: string;
}

export interface ClassOverview {
  sessionCount: number;
  participantCount: number;
  quizAccuracy: number | null;
}
