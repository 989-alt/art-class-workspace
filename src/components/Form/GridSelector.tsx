import type { Orientation, PaperSize } from '../../types';
import { PAPER_DIMENSIONS } from '../../types';
import './GridSelector.css';

interface GridSelectorProps {
    gridN: number;
    gridM: number;
    orientation: Orientation;
    paperSize: PaperSize;
    onGridNChange: (n: number) => void;
    onGridMChange: (m: number) => void;
    disabled: boolean;
}

const options = [1, 2, 3, 4, 5, 6];

export default function GridSelector({ gridN, gridM, orientation, paperSize, onGridNChange, onGridMChange, disabled }: GridSelectorProps) {
    // Get paper dimensions based on size and orientation
    const baseDimensions = PAPER_DIMENSIONS[paperSize];
    const pieceW = orientation === 'vertical' ? baseDimensions.width : baseDimensions.height;
    const pieceH = orientation === 'vertical' ? baseDimensions.height : baseDimensions.width;

    return (
        <div className="grid-sel">
            <label className="grid-sel__label">분할 그리드 (N × M)</label>

            <div className="grid-sel__row">
                <div className="grid-sel__field">
                    <span className="grid-sel__dim">가로 (N)</span>
                    <select
                        className="grid-sel__select"
                        value={gridN}
                        onChange={(e) => onGridNChange(Number(e.target.value))}
                        disabled={disabled}
                    >
                        {options.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>

                <span className="grid-sel__x">×</span>

                <div className="grid-sel__field">
                    <span className="grid-sel__dim">세로 (M)</span>
                    <select
                        className="grid-sel__select"
                        value={gridM}
                        onChange={(e) => onGridMChange(Number(e.target.value))}
                        disabled={disabled}
                    >
                        {options.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Mini grid preview */}
            <div className="grid-sel__preview" aria-label={`${gridN} × ${gridM} 그리드 미리보기`}>
                <div
                    className="grid-sel__grid"
                    style={{
                        gridTemplateColumns: `repeat(${gridN}, 1fr)`,
                        gridTemplateRows: `repeat(${gridM}, 1fr)`,
                        aspectRatio: `${gridN * pieceW} / ${gridM * pieceH}`,
                    }}
                >
                    {Array.from({ length: gridN * gridM }).map((_, i) => (
                        <div key={i} className="grid-sel__cell" />
                    ))}
                </div>
                <span className="grid-sel__info">
                    총 {gridN * gridM}장 {paperSize} 출력
                </span>
            </div>
        </div>
    );
}
