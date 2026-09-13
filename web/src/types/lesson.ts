import type { ActivityContent, ActivityType } from './modoAula';

export type SlideType = ActivityType | 'material';

export interface LessonConfig {
  allowNotes: boolean;
  allowFreeChatbot: boolean;
  focusMode: boolean;
  accessibilityMode: boolean;
}

export interface LessonSlide {
  id: string;
  position: number;
  type: SlideType;
  content: ActivityContent | null;
  textContent: string | null;
  filePath: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  accessibilityCaption: string | null;
}

export interface Lesson {
  id: string;
  classId: string;
  name: string;
  subject: string;
  config: LessonConfig;
}
