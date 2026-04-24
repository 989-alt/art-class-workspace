import { useEffect, useRef, useState } from 'react';
import type { PaperSize, Orientation } from '../../types';
import { PAPER_DIMENSIONS } from '../../types';
import { applyCvdSimulation, getCvdMatrix, type CvdMode } from '../../utils/cvdSimulation';
import './CanvasPreview.css';

interface CanvasPreviewProps {
    image: string | null;
    gridN: number;
    gridM: number;
    paperSize: PaperSize;
    orientation: Orientation;
    isLoading: boolean;
    onApplyLineBoost?: () => void;
}

interface CvdTab {
    id: CvdMode;
    label: string;
    tooltip: string;
}

const CVD_TABS: CvdTab[] = [
    { id: 'normal', label: '정상', tooltip: '정상 색각' },
    { id: 'D', label: 'D', tooltip: '적록 색약(D)' },
    { id: 'P', label: 'P', tooltip: '적록 색맹(P)' },
    { id: 'T', label: 'T', tooltip: '청황 색약(T)' },
];

// "선 굵기 +20% 자동 보정"
const BOOST_PILL_TEXT = '선 굵기 +20% 자동 보정';
// "적용"
const BOOST_APPLY_LABEL = '적용';

export default function CanvasPreview({
    image,
    gridN,
    gridM,
    paperSize,
    orientation,
    isLoading,
    onApplyLineBoost,
}: CanvasPreviewProps) {
    const [cvdMode, setCvdMode] = useState<CvdMode>('normal');
    const [cvdDataUrl, setCvdDataUrl] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Reset CVD state whenever the underlying source image changes
    useEffect(() => {
        setCvdMode('normal');
        setCvdDataUrl(null);
    }, [image]);

    // Render CVD simulation whenever mode or image changes
    useEffect(() => {
        if (!image || cvdMode === 'normal') {
            setCvdDataUrl(null);
            return;
        }

        let cancelled = false;
        const matrix = getCvdMatrix(cvdMode);
        if (!matrix) {
            setCvdDataUrl(null);
            return;
        }

        const img = new Image();
        img.onload = () => {
            if (cancelled) return;
            const canvas = canvasRef.current ?? document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0);
            applyCvdSimulation(ctx, matrix);
            setCvdDataUrl(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            if (!cancelled) setCvdDataUrl(null);
        };
        img.src = `data:image/png;base64,${image}`;

        return () => {
            cancelled = true;
        };
    }, [image, cvdMode]);

    if (isLoading || !image) return null;

    // Calculate aspect ratio based on paper size and orientation
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;
    const totalW = gridN * pieceW;
    const totalH = gridM * pieceH;
    const aspectRatio = `${totalW} / ${totalH}`;

    const displaySrc =
        cvdMode !== 'normal' && cvdDataUrl
            ? cvdDataUrl
            : `data:image/png;base64,${image}`;

    return (
        <div className="canvas-preview">
            <div className="canvas-preview__cvd-tabs" role="tablist" aria-label="색각 프리뷰">
                {CVD_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={cvdMode === tab.id}
                        title={tab.tooltip}
                        className={
                            'canvas-preview__cvd-tab' +
                            (cvdMode === tab.id ? ' canvas-preview__cvd-tab--active' : '')
                        }
                        onClick={() => setCvdMode(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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

            {/* Line-boost suggestion pill — shown only when CVD preview is non-normal */}
            {cvdMode !== 'normal' && onApplyLineBoost && (
                <div className="canvas-preview__boost-pill" role="status">
                    <span className="canvas-preview__boost-text">{BOOST_PILL_TEXT}</span>
                    <button
                        type="button"
                        className="canvas-preview__boost-apply"
                        onClick={onApplyLineBoost}
                    >
                        {BOOST_APPLY_LABEL}
                    </button>
                </div>
            )}

            <div className="canvas-preview__info">
                {paperSize} {orientation === 'vertical' ? '세로' : '가로'} • {gridN}×{gridM} 그리드
            </div>

            {/* Hidden canvas used as a scratch surface for CVD rendering */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
}
