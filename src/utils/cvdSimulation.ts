/**
 * Color Vision Deficiency (CVD) simulation utilities.
 *
 * Matrices are taken from Machado, Oliveira, Fernandes (2009) CVD simulation
 * (widely used approximations of Brettel/Viénot models) applied directly
 * in sRGB space for a fast canvas post-process. Source image pixels are
 * multiplied by the 3x3 matrix and clamped to [0, 255].
 *
 * These approximations are good enough for "teacher preview" purposes —
 * they tell the educator whether a coloring design still conveys its line
 * structure to students with red-green or blue-yellow color vision deficits.
 */

export type CvdMode = 'normal' | 'D' | 'P' | 'T';

// Deuteranopia (green-weak / green-blind) — most common (~5% males)
export const SIM_DEUTERANOPIA: number[][] = [
    [0.367, 0.861, -0.228],
    [0.280, 0.673, 0.047],
    [-0.012, 0.043, 0.969],
];

// Protanopia (red-weak / red-blind) — ~1% males
export const SIM_PROTANOPIA: number[][] = [
    [0.152, 1.053, -0.205],
    [0.115, 0.786, 0.099],
    [-0.004, -0.048, 1.052],
];

// Tritanopia (blue-weak / blue-blind) — <1%
export const SIM_TRITANOPIA: number[][] = [
    [1.256, -0.077, -0.179],
    [-0.078, 0.931, 0.148],
    [0.005, 0.691, 0.304],
];

export function getCvdMatrix(mode: CvdMode): number[][] | null {
    switch (mode) {
        case 'D':
            return SIM_DEUTERANOPIA;
        case 'P':
            return SIM_PROTANOPIA;
        case 'T':
            return SIM_TRITANOPIA;
        default:
            return null;
    }
}

/**
 * Apply a CVD simulation matrix in-place on a CanvasRenderingContext2D.
 * Reads the full canvas image data, transforms each RGBA pixel, writes back.
 */
export function applyCvdSimulation(
    ctx: CanvasRenderingContext2D,
    matrix: number[][]
): void {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const m00 = matrix[0][0], m01 = matrix[0][1], m02 = matrix[0][2];
    const m10 = matrix[1][0], m11 = matrix[1][1], m12 = matrix[1][2];
    const m20 = matrix[2][0], m21 = matrix[2][1], m22 = matrix[2][2];

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const nr = m00 * r + m01 * g + m02 * b;
        const ng = m10 * r + m11 * g + m12 * b;
        const nb = m20 * r + m21 * g + m22 * b;

        data[i] = clamp8(nr);
        data[i + 1] = clamp8(ng);
        data[i + 2] = clamp8(nb);
        // alpha unchanged
    }

    ctx.putImageData(imageData, 0, 0);
}

function clamp8(v: number): number {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return v | 0;
}
