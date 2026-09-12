export interface ChatTurn {
  id: string;
  role: 'student' | 'tutor';
  content: string;
}
