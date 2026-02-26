import type { Mode, Difficulty, MandalaPreset, Orientation, PaperSize, ArtStyle, CalligraphyFont } from '../types';
import { MANDALA_PRESET_LABELS, ART_STYLE_LABELS } from '../types';
import { calculateAspectRatio } from '../utils/aspectRatio';

const ORIENTATION_DESC: Record<Orientation, string> = {
    vertical: 'portrait orientation (taller than wide)',
    horizontal: 'landscape orientation (wider than tall)',
};

const DIFFICULTY_MAP: Record<Difficulty, string> = {
    easy: 'simple design with few large shapes and thick outlines, minimal detail, suitable for young children',
    medium: 'moderate detail with clear outlines, some smaller elements, suitable for older children',
    hard: 'highly detailed and intricate patterns with fine lines and complex elements, suitable for advanced students',
};

/**
 * Common line-art requirements appended to every prompt to ensure
 * the output is always a coloring-page style design (outlines only).
 */
const LINE_ART_REQUIREMENTS = [
    'Requirements: pure black outlines on a pure white background. NO shading, NO gradients, NO color fills, NO gray areas, NO halftones.',
    'The image must be a clean coloring page: only black line-art outlines on white, so that students can color it in themselves.',
    'IMPORTANT: Do NOT include any text, letters, words, numbers, or written characters anywhere in the design.',
    'CRITICAL: The design MUST fill the ENTIRE canvas from edge to edge with NO empty margins or borders.',
    'Clean, crisp vector-like line art quality suitable for printing and coloring with colored pencils or markers.',
].join('\n');

export function buildPrompt(
    mode: Mode,
    artStyle: ArtStyle,
    calligraphyText: string | undefined,
    topic: string,
    mandalaPreset: MandalaPreset,
    difficulty: Difficulty,
    orientation: Orientation,
    paperSize: PaperSize,
    gridN: number,
    gridM: number,
    calligraphyFont?: CalligraphyFont
): string {
    const aspectRatio = calculateAspectRatio(gridN, gridM, orientation, paperSize);
    const difficultyDesc = DIFFICULTY_MAP[difficulty];
    const orientationDesc = ORIENTATION_DESC[orientation];

    // ─── 만다라 모드 ───
    if (mode === 'mandala') {
        const theme = MANDALA_PRESET_LABELS[mandalaPreset];
        return [
            `Create a black and white mandala coloring page with a "${theme}" theme.`,
            `Style: ${difficultyDesc}.`,
            `The mandala should be a symmetric, circular pattern centered in the image.`,
            `Layout: ${orientationDesc}. Aspect ratio MUST be exactly ${aspectRatio}.`,
            LINE_ART_REQUIREMENTS,
        ].join('\n');
    }

    // ─── 서예(캘리그래피) 모드 ───
    if (artStyle === 'calligraphy') {
        const textToWrite = calligraphyText?.trim() || '서예';

        // 서체별 상세 프롬프트
        const fontDescriptions: Record<CalligraphyFont, string> = {
            panbonche: [
                `Write the text "${textToWrite}" in traditional Korean 판본체 (Panbonche / Woodblock Print Style).`,
                `판본체 characteristics: This is a historic Korean typeface derived from woodblock-printed books of the Joseon Dynasty.`,
                `The strokes are angular, bold, and geometric with sharp right-angle turns. Each stroke has uniform thickness with minimal variation.`,
                `The characters appear as if carved into a wooden block — structured, formal, and dignified.`,
                `Horizontal strokes are perfectly horizontal, vertical strokes are perfectly vertical, with distinctive sharp angular endings.`,
                `The overall impression should be of traditional Korean woodblock printing with strong, deliberate strokes.`,
            ].join(' '),
            gungche: [
                `Write the text "${textToWrite}" in traditional Korean 궁체 (Gungche / Palace Style Calligraphy).`,
                `궁체 characteristics: This is an elegant, flowing Korean calligraphy style historically used by court women in the Joseon Dynasty royal palace.`,
                `The strokes are smooth, flowing, and graceful with natural brush-stroke thickness variation — thicker on downstrokes, thinner on upstrokes.`,
                `Each character flows with organic curves and rounded turns, giving a sense of elegance and refinement.`,
                `The brush movement should be visible in the stroke, showing natural ink flow with tapered beginnings and endings.`,
                `The overall impression should be of refined, aristocratic Korean calligraphy with graceful, dancing brush strokes.`,
            ].join(' '),
        };

        const fontDesc = fontDescriptions[calligraphyFont || 'panbonche'];

        return [
            fontDesc,
            `Style complexity: ${difficultyDesc}.`,
            `Layout: ${orientationDesc}. Aspect ratio MUST be exactly ${aspectRatio}.`,
            `The calligraphy must be rendered as BLACK brush strokes on a pure WHITE background.`,
            `Write ONLY the exact text "${textToWrite}" — no additional characters or decorations.`,
            `The text should be centered and large enough to fill most of the canvas.`,
            `CRITICAL: The artwork MUST completely fill the ENTIRE canvas from edge to edge with NO empty margins or borders.`,
            `The result should look like authentic traditional Korean calligraphy suitable for students to trace or study.`,
        ].join('\n');
    }

    // ─── 선화(Line Art) 모드 ───
    if (artStyle === 'line-art') {
        return [
            `Create a black and white line art coloring page of "${topic}".`,
            `Style: ${difficultyDesc}.`,
            `Layout: ${orientationDesc}. Aspect ratio MUST be exactly ${aspectRatio}.`,
            LINE_ART_REQUIREMENTS,
        ].join('\n');
    }

    // ─── 기타 화풍 (정물화, 수채화, 유화, 점묘화) — 모두 선화 도안으로 생성 ───
    const styleString = ART_STYLE_LABELS[artStyle] || 'art';
    return [
        `Create a black and white LINE ART coloring page of "${topic}" drawn in a ${styleString} composition style.`,
        `Use the composition, subject arrangement, and artistic perspective typical of ${styleString}, but render it ONLY as black outlines on white background.`,
        `Complexity: ${difficultyDesc}.`,
        `Layout: ${orientationDesc}. Aspect ratio MUST be exactly ${aspectRatio}.`,
        LINE_ART_REQUIREMENTS,
    ].join('\n');
}

export function buildEditPrompt(editType: string): string {
    const editMap: Record<string, string> = {
        thicker: 'Make all the outlines and lines significantly thicker and bolder. Keep everything else the same.',
        thinner: 'Make all the outlines and lines thinner and more delicate. Keep everything else the same.',
        simplify: 'Simplify the design by removing small details and merging small shapes into larger ones. Keep the overall composition.',
        addDetail: 'Add more intricate details and patterns to the existing design. Keep the overall composition.',
        addPattern: 'Add a decorative geometric pattern to the background areas. Keep the main subject the same.',
        removeBackground: 'Remove all background elements and patterns. Keep only the main subject with clean white background.',
    };

    return (
        editMap[editType] ||
        'Refine and improve this black and white line art coloring page. Keep the same subject.'
    );
}
