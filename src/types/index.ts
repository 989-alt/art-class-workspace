export type Mode = 'free' | 'mandala' | 'curriculum';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Orientation = 'vertical' | 'horizontal';

export type PaperSize = 'A5' | 'A4' | 'A3' | 'A2' | 'A1' | 'B5' | 'B4' | 'B3' | 'B2' | 'B1';

// Paper dimensions in mm (width x height in portrait orientation)
export const PAPER_DIMENSIONS: Record<PaperSize, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
  B5: { width: 176, height: 250 },
  B4: { width: 250, height: 353 },
  B3: { width: 353, height: 500 },
  B2: { width: 500, height: 707 },
  B1: { width: 707, height: 1000 },
};

export type MandalaPreset =
  | 'cosmos'
  | 'nature'
  | 'flower'
  | 'snow'
  | 'ocean'
  | 'butterfly'
  | 'star'
  | 'leaf';

export const MANDALA_PRESET_LABELS: Record<MandalaPreset, string> = {
  cosmos: '우주',
  nature: '자연',
  flower: '꽃',
  snow: '눈',
  ocean: '바다',
  butterfly: '나비',
  star: '별',
  leaf: '나뭇잎',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '하 (쉬움)',
  medium: '중 (보통)',
  hard: '상 (어려움)',
};

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  vertical: '세로',
  horizontal: '가로',
};

export const MODE_LABELS: Record<Mode, string> = {
  free: '자유 주제',
  mandala: '만다라',
  curriculum: '교과서',
};

export interface GenerationConfig {
  mode: Mode;
  topic: string;
  mandalaPreset: MandalaPreset;
  difficulty: Difficulty;
  orientation: Orientation;
  paperSize: PaperSize;
  gridN: number;
  gridM: number;
  presetId?: string;
  selectedTopic?: string | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
}

export interface GalleryItem {
  id: string;
  image: string;
  config: GenerationConfig;
  createdAt: number;
  /**
   * Original generation prompt sent to Gemini. Used by the copyright
   * certificate so that selecting an older gallery item reproduces the
   * exact prompt recorded on that item (not the most-recent prompt).
   * Never modified by subsequent edits.
   */
  prompt: string;
}
