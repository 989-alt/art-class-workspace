import type { PaperSize, Orientation } from '../types';
import { PAPER_DIMENSIONS } from '../types';

/**
 * Resize an image to match the target paper aspect ratio.
 * The image will be cropped from the center to fit the aspect ratio.
 */
export async function resizeImageToAspectRatio(
    base64Image: string,
    gridN: number,
    gridM: number,
    paperSize: PaperSize,
    orientation: Orientation,
    maxDimension: number = 2048
): Promise<string> {
    const img = await loadImage(`data:image/png;base64,${base64Image}`);

    // Calculate target aspect ratio
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;
    const targetRatio = (gridN * pieceW) / (gridM * pieceH);

    // Calculate source dimensions (center crop)
    const sourceRatio = img.width / img.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceW = img.width;
    let sourceH = img.height;

    if (sourceRatio > targetRatio) {
        // Source is wider than target - crop width
        sourceW = Math.round(img.height * targetRatio);
        sourceX = Math.round((img.width - sourceW) / 2);
    } else if (sourceRatio < targetRatio) {
        // Source is taller than target - crop height
        sourceH = Math.round(img.width / targetRatio);
        sourceY = Math.round((img.height - sourceH) / 2);
    }

    // Calculate output dimensions
    let outputW: number;
    let outputH: number;
    if (targetRatio >= 1) {
        outputW = maxDimension;
        outputH = Math.round(maxDimension / targetRatio);
    } else {
        outputH = maxDimension;
        outputW = Math.round(maxDimension * targetRatio);
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;

    // Fill with white background (in case of transparency)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, outputW, outputH);

    // Draw the cropped and resized image
    ctx.drawImage(
        img,
        sourceX, sourceY, sourceW, sourceH,
        0, 0, outputW, outputH
    );

    // Return as base64 (without the data:image/png;base64, prefix)
    return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * Download a resized image as PNG.
 */
export async function downloadResizedPng(
    base64Image: string,
    gridN: number,
    gridM: number,
    paperSize: PaperSize,
    orientation: Orientation,
    filename: string = 'art-class-도안.png'
): Promise<void> {
    const resized = await resizeImageToAspectRatio(
        base64Image,
        gridN,
        gridM,
        paperSize,
        orientation
    );

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${resized}`;
    link.download = filename;
    link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
        img.src = src;
    });
}
