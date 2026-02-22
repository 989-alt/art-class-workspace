import type { PaperSize, Orientation } from '../../types';
import { PAPER_DIMENSIONS } from '../../types';
import './CanvasPreview.css';

interface CanvasPreviewProps {
    image: string | null;
    gridN: number;
    gridM: number;
    paperSize: PaperSize;
    orientation: Orientation;
    isLoading: boolean;
}

export default function CanvasPreview({ image, gridN, gridM, paperSize, orientation, isLoading }: CanvasPreviewProps) {
    if (isLoading || !image) return null;

    // Calculate aspect ratio based on paper size and orientation
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;
    const totalW = gridN * pieceW;
    const totalH = gridM * pieceH;
    const aspectRatio = `${totalW} / ${totalH}`;

    return (
        <div className="canvas-preview">
            <div
                className="canvas-preview__container"
                style={{ aspectRatio }}
            >
                <img
                    className="canvas-preview__image"
                    src={`data:image/png;base64,${image}`}
                    alt="생성된 도안"
                />
                {/* Grid overlay */}
                {(gridN > 1 || gridM > 1) && (
                    <div className="canvas-preview__overlay">
                        {/* Vertical lines */}
                        {Array.from({ length: gridN - 1 }).map((_, i) => (
                            <div
                                key={`v-${i}`}
                                className="canvas-preview__guide canvas-preview__guide--v"
                                style={{ left: `${((i + 1) / gridN) * 100}%` }}
                            />
                        ))}
                        {/* Horizontal lines */}
                        {Array.from({ length: gridM - 1 }).map((_, i) => (
                            <div
                                key={`h-${i}`}
                                className="canvas-preview__guide canvas-preview__guide--h"
                                style={{ top: `${((i + 1) / gridM) * 100}%` }}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div className="canvas-preview__info">
                {paperSize} {orientation === 'vertical' ? '세로' : '가로'} • {gridN}×{gridM} 그리드
            </div>
        </div>
    );
}
