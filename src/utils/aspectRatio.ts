import type { Orientation, PaperSize } from '../types';
import { PAPER_DIMENSIONS } from '../types';

/**
 * Get the paper dimensions based on size and orientation.
 */
export function getPaperDimensions(
    paperSize: PaperSize,
    orientation: Orientation
): { width: number; height: number } {
    const base = PAPER_DIMENSIONS[paperSize];
    if (orientation === 'horizontal') {
        return { width: base.height, height: base.width };
    }
    return { width: base.width, height: base.height };
}

/**
 * Calculate the aspect ratio string for the full image
 * based on the NxM grid, paper size, and orientation.
 */
export function calculateAspectRatio(
    n: number,
    m: number,
    orientation: Orientation = 'vertical',
    paperSize: PaperSize = 'A4'
): string {
    const paper = getPaperDimensions(paperSize, orientation);
    const w = n * paper.width;
    const h = m * paper.height;
    const g = gcd(w, h);
    return `${w / g}:${h / g}`;
}

/**
 * Calculate target image dimensions for generation.
 * Targets ~1024px on the largest side while maintaining aspect ratio.
 */
export function calculateImageDimensions(
    n: number,
    m: number,
    orientation: Orientation = 'vertical',
    paperSize: PaperSize = 'A4'
): { width: number; height: number } {
    const paper = getPaperDimensions(paperSize, orientation);
    const ratio = (n * paper.width) / (m * paper.height);
    if (ratio >= 1) {
        return { width: 1024, height: Math.round(1024 / ratio) };
    }
    return { width: Math.round(1024 * ratio), height: 1024 };
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}
