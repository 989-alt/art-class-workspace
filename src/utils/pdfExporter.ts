import { jsPDF } from 'jspdf';
import type { PaperSize, Orientation } from '../types';
import { PAPER_DIMENSIONS } from '../types';

/**
 * Export the generated image as a multi-page PDF,
 * split into N x M grid pieces, each on a separate page at (0,0) with no margins.
 */
export async function exportToPdf(
    base64Image: string,
    gridN: number,
    gridM: number,
    paperSize: PaperSize = 'A4',
    orientation: Orientation = 'vertical',
    filename: string = 'art-class-도안.pdf'
): Promise<void> {
    // Load image into canvas
    const img = await loadImage(`data:image/png;base64,${base64Image}`);
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.drawImage(img, 0, 0);

    // Each piece dimensions in pixels
    const pieceW = Math.floor(img.width / gridN);
    const pieceH = Math.floor(img.height / gridM);

    // Get paper dimensions
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pageW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pageH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;

    // jsPDF format string (lowercase)
    const format = paperSize.toLowerCase();
    const jsPdfOrientation = orientation === 'vertical' ? 'portrait' : 'landscape';

    const doc = new jsPDF({
        orientation: jsPdfOrientation,
        unit: 'mm',
        format: format,
    });

    let isFirstPage = true;

    for (let row = 0; row < gridM; row++) {
        for (let col = 0; col < gridN; col++) {
            if (!isFirstPage) {
                doc.addPage(format, jsPdfOrientation);
            }
            isFirstPage = false;

            // Extract piece from source canvas
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = pieceW;
            pieceCanvas.height = pieceH;
            const pieceCtx = pieceCanvas.getContext('2d')!;
            pieceCtx.drawImage(
                sourceCanvas,
                col * pieceW,
                row * pieceH,
                pieceW,
                pieceH,
                0,
                0,
                pieceW,
                pieceH
            );

            const pieceDataUrl = pieceCanvas.toDataURL('image/png');

            // Add image at (0, 0) filling entire page — no margins
            doc.addImage(pieceDataUrl, 'PNG', 0, 0, pageW, pageH);
        }
    }

    doc.save(filename);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
        img.src = src;
    });
}
