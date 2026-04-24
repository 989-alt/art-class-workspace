import type { Difficulty, PaperSize, Orientation } from './index';

export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Semester = 1 | 2;
export type Subject = '국어' | '사회' | '과학' | '미술' | '도덕' | '실과';

export interface CurriculumPreset {
  id: string;
  grade: Grade;
  semester: Semester;
  subject: Subject;
  unitTitle: string;
  unitCode: string;
  thumbnailEmoji: string;
  suggestedTopics: string[];
  basePrompt: string;
  styleDirective: string;
  difficulty: Difficulty;
  defaultGrid: { n: number; m: number };
  defaultPaper: PaperSize;
  defaultOrientation: Orientation;
  teachingNote: string;
  learningObjectives: string[];
  timeEstimate: number;
}
