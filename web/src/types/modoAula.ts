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
  /** Only populated on the teacher side (useTeacherSession) — drives the class mood snapshot. */
  classId?: string;
  code: string;
  status: SessionStatus;
  topic: string;
  teacherName?: string;
  createdAt?: string;
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
  allowTranscription?: boolean;
}

export interface ContentTrigger {
  id: string;
  textContent: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  accessibilityCaption: string | null;
}
