import { useState, useEffect } from 'react';
import type { PaperSize, Orientation } from '../../types';
import { PAPER_DIMENSIONS } from '../../types';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
    isVisible: boolean;
    progress?: { current: number; total: number } | null;
    gridN?: number;
    gridM?: number;
    paperSize?: PaperSize;
    orientation?: Orientation;
}

const messages = [
    { text: 'AI가 밑그림을 스케치하는 중...', icon: '✏️' },
    { text: '윤곽선을 다듬는 중...', icon: '🖊️' },
    { text: '펜 터치를 마무리하는 중...', icon: '🎨' },
    { text: '거의 완성되었어요!', icon: '✨' },
];

export default function SkeletonLoader({
    isVisible,
    progress,
    gridN = 1,
    gridM = 1,
    paperSize = 'A4',
    orientation = 'vertical'
}: SkeletonLoaderProps) {
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) {
            setMsgIndex(0);
            return;
        }
        const timer = setInterval(() => {
            setMsgIndex((prev) => (prev + 1) % messages.length);
        }, 2500);
        return () => clearInterval(timer);
    }, [isVisible]);

    if (!isVisible) return null;

    const current = messages[msgIndex];

    // Calculate aspect ratio
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;
    const aspectRatio = `${gridN * pieceW} / ${gridM * pieceH}`;

    return (
        <div className="skeleton">
            <div className="skeleton__box" style={{ aspectRatio }}>
                <div className="skeleton__pulse" />
                <div className="skeleton__content">
                    <div className="skeleton__icon">{current.icon}</div>
                    <p className="skeleton__text" key={msgIndex}>{current.text}</p>
                    {progress && progress.total > 1 && (
                        <p className="skeleton__progress">
                            {progress.current} / {progress.total} 생성 중
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
