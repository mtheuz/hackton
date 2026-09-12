export type ActivityType = 'quiz' | 'poll' | 'open_question';

export interface QuizContent {
  question: string;
  options: string[];
  correct_index: number;
}

export interface PollContent {
  question: string;
  options: string[];
}

export interface OpenQuestionContent {
  question: string;
}

export type ActivityContent = QuizContent | PollContent | OpenQuestionContent;

export interface LiveActivity {
  id: string;
  type: ActivityType;
  content: ActivityContent;
}

export type SessionStatus = 'active' | 'finished';

export interface LiveSession {
  id: string;
  code: string;
  status: SessionStatus;
}

export interface TeacherClass {
  id: string;
  name: string;
  disciplineId?: string | null;
}

export interface OptionTally {
  kind: 'options';
  counts: number[];
}

export interface TextTally {
  kind: 'texts';
  texts: string[];
}

export type AnswerTally = OptionTally | TextTally;

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
