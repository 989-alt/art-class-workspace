export type Mode = 'free' | 'mandala';

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

export interface GenerationConfig {
  mode: Mode;
  topic: string;
  mandalaPreset: MandalaPreset;
  difficulty: Difficulty;
  orientation: Orientation;
  paperSize: PaperSize;
  gridN: number;
  gridM: number;
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
}
