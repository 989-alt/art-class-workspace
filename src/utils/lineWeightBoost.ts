/**
 * Line Weight Boost — thickens dark pixels (lines) in a PNG by ~20% via
 * a 3x3 morphological dilation pass. Used as an accessibility assist when
 * color-vision-deficient students need stronger line contrast in a coloring
 * page print.
 *
 * Algorithm:
 *  1. Load the base64 PNG into an offscreen canvas.
 *  2. For each pixel, look at the 3x3 neighborhood. If any neighbor is darker
 *     (luminance below threshold), adopt the darkest neighbor's RGB.
 *  3. Return the new canvas as a base64-encoded PNG (no data-URL prefix).
 */

const DARK_THRESHOLD = 128; // 0..255 luminance cutoff — pixels darker than this are "line"

function luminance(r: number, g: number, b: number): number {
    // ITU-R BT.601 luma approximation
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

export async function applyLineWeightBoost(base64Png: string): Promise<string> {
    const img = await loadImage(`data:image/png;base64,${base64Png}`);

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas 2D context unavailable.');
    }
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;
    const source = ctx.getImageData(0, 0, w, h);
    const src = source.data;
    const out = new Uint8ClampedArray(src.length);
    out.set(src);

    // 3x3 min-luminance dilation pass: each output pixel becomes the darkest
    // pixel within its 3x3 neighborhood (if darker than threshold).
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const centerIdx = (y * w + x) * 4;
            let darkestLum = luminance(src[centerIdx], src[centerIdx + 1], src[centerIdx + 2]);
            let darkestIdx = centerIdx;

            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= w) continue;
                    if (dx === 0 && dy === 0) continue;
                    const nIdx = (ny * w + nx) * 4;
                    const nLum = luminance(src[nIdx], src[nIdx + 1], src[nIdx + 2]);
                    if (nLum < darkestLum && nLum < DARK_THRESHOLD) {
                        darkestLum = nLum;
                        darkestIdx = nIdx;
                    }
                }
            }

            if (darkestIdx !== centerIdx) {
                out[centerIdx] = src[darkestIdx];
                out[centerIdx + 1] = src[darkestIdx + 1];
                out[centerIdx + 2] = src[darkestIdx + 2];
                // keep original alpha
            }
        }
    }

    const boosted = new ImageData(out, w, h);
    ctx.putImageData(boosted, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    // strip "data:image/png;base64," prefix to match existing state format
    const commaIdx = dataUrl.indexOf(',');
    return commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed.'));
        img.src = src;
    });
}
