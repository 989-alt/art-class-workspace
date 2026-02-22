import type { PaperSize } from '../../types';
import { PAPER_DIMENSIONS } from '../../types';
import './PaperSizeSelector.css';

interface PaperSizeSelectorProps {
    paperSize: PaperSize;
    onPaperSizeChange: (size: PaperSize) => void;
    disabled: boolean;
}

const sizeGroups = {
    A: ['A5', 'A4', 'A3', 'A2', 'A1'] as PaperSize[],
    B: ['B5', 'B4', 'B3', 'B2', 'B1'] as PaperSize[],
};

export default function PaperSizeSelector({
    paperSize,
    onPaperSizeChange,
    disabled
}: PaperSizeSelectorProps) {
    const dimensions = PAPER_DIMENSIONS[paperSize];

    return (
        <div className="paper-sel">
            <label className="paper-sel__label">용지 크기</label>

            <div className="paper-sel__groups">
                {Object.entries(sizeGroups).map(([group, sizes]) => (
                    <div key={group} className="paper-sel__group">
                        <span className="paper-sel__group-label">{group} 시리즈</span>
                        <div className="paper-sel__options">
                            {sizes.map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    className={`paper-sel__btn ${paperSize === size ? 'paper-sel__btn--active' : ''}`}
                                    onClick={() => onPaperSizeChange(size)}
                                    disabled={disabled}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="paper-sel__info">
                <span className="paper-sel__dimensions">
                    {dimensions.width} × {dimensions.height} mm
                </span>
            </div>
        </div>
    );
}
