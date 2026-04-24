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
    isBoosting?: boolean;
    onApplyLineBoost?: () => void;
}

// "선 굵기 +20% 보정"
const BOOST_PILL_TEXT = '선 굵기 +20% 보정';
// "적용"
const BOOST_APPLY_LABEL = '적용';
// "적용 중..."
const BOOST_APPLYING_LABEL = '적용 중...';
// aria-label for the apply button — provides context beyond the visible "적용" text
const BOOST_APPLY_ARIA = '선 굵기 +20% 보정 적용';

export default function CanvasPreview({
    image,
    gridN,
    gridM,
    paperSize,
    orientation,
    isLoading,
    isBoosting = false,
    onApplyLineBoost,
}: CanvasPreviewProps) {
    if (isLoading || !image) return null;

    // Calculate aspect ratio based on paper size and orientation
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;
    const totalW = gridN * pieceW;
    const totalH = gridM * pieceH;
    const aspectRatio = `${totalW} / ${totalH}`;

    const displaySrc = `data:image/png;base64,${image}`;

    return (
        <div className="canvas-preview">
            <div
                className="canvas-preview__container"
                style={{ aspectRatio }}
            >
                <img
                    className="canvas-preview__image"
                    src={displaySrc}
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

            {/* Line-boost manual button — shown whenever the host wires it up */}
            {onApplyLineBoost && (
                <div className="canvas-preview__boost-pill" role="status">
                    <span className="canvas-preview__boost-text">{BOOST_PILL_TEXT}</span>
                    <button
                        type="button"
                        className="canvas-preview__boost-apply"
                        onClick={onApplyLineBoost}
                        disabled={isBoosting}
                        aria-label={BOOST_APPLY_ARIA}
                        aria-busy={isBoosting}
                    >
                        {isBoosting ? BOOST_APPLYING_LABEL : BOOST_APPLY_LABEL}
                    </button>
                </div>
            )}

            <div className="canvas-preview__info">
                {paperSize} {orientation === 'vertical' ? '세로' : '가로'} • {gridN}×{gridM} 그리드
            </div>
        </div>
    );
}
