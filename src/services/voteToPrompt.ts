import type { CurriculumPreset } from '../types/curriculum';
import type { VoteAggregation } from '../types/classroom';

// Mirror of the COMMON_TAIL_SCENE constant in promptBuilder.ts. Kept inline
// to avoid exporting internal scaffolding. If that list changes in the
// prompt builder, update here too.
const COMMON_TAIL: string[] = [
    `Requirements: pure black outlines on a pure white background, no shading, no gradients, no color fills, no gray areas.`,
    `IMPORTANT: Do NOT include any text, letters, words, numbers, or written characters anywhere in the design.`,
    `CRITICAL: The design MUST fill the ENTIRE canvas from edge to edge with NO empty margins or borders. Extend the scene, background elements, and details all the way to the edges of the image.`,
    `The design must be suitable for printing and coloring with colored pencils or markers.`,
    `Clean, crisp vector-like line art quality.`,
];

/**
 * Pick the first (highest count) value or null if empty.
 */
function top(list: Array<{ value: string; count: number }>): string | null {
    return list.length > 0 ? list[0].value : null;
}

/**
 * Compose an English prompt that encodes the classroom's majority votes:
 * - top keyword becomes the focus subject
 * - top palette (line weight) becomes a rendering directive
 * - top detail level becomes a density directive
 *
 * Falls back gracefully (omits the affected line) when a category has no votes.
 */
export function composeVotedPrompt(
    preset: CurriculumPreset,
    aggregation: VoteAggregation
): string {
    const keyword = top(aggregation.keywords);
    const palette = top(aggregation.palettes);
    const detail = top(aggregation.details);

    const lines: string[] = [preset.basePrompt, preset.styleDirective];

    if (keyword) {
        lines.push(`Class vote emphasis on: ${keyword}.`);
    }
    if (palette) {
        lines.push(`Line weight preference: ${palette}.`);
    }
    if (detail) {
        lines.push(`Detail density: ${detail}.`);
    }

    lines.push(...COMMON_TAIL);
    return lines.join('\n');
}
