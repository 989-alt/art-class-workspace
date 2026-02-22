import type { Orientation } from '../../types';
import './OrientationSelector.css';

interface OrientationSelectorProps {
    orientation: Orientation;
    onOrientationChange: (o: Orientation) => void;
    disabled: boolean;
}

const orientations: Orientation[] = ['vertical', 'horizontal'];

const orientationConfig: Record<Orientation, { label: string; desc: string }> = {
    vertical: { label: '세로', desc: '인물, 풍경 세로' },
    horizontal: { label: '가로', desc: '풍경, 파노라마' },
};

export default function OrientationSelector({
    orientation,
    onOrientationChange,
    disabled
}: OrientationSelectorProps) {
    return (
        <div className="orient-sel">
            <label className="orient-sel__label">방향 선택</label>
            <div className="orient-sel__options">
                {orientations.map((o) => (
                    <button
                        key={o}
                        type="button"
                        className={`orient-sel__btn ${orientation === o ? 'orient-sel__btn--active' : ''}`}
                        onClick={() => onOrientationChange(o)}
                        disabled={disabled}
                        aria-pressed={orientation === o}
                    >
                        <div className={`orient-sel__preview orient-sel__preview--${o}`}>
                            <div className="orient-sel__preview-inner">
                                <svg viewBox="0 0 24 24" className="orient-sel__icon">
                                    {o === 'vertical' ? (
                                        <>
                                            <rect x="6" y="2" width="12" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                                            <line x1="9" y1="7" x2="15" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                            <line x1="9" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                            <line x1="9" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                        </>
                                    ) : (
                                        <>
                                            <rect x="2" y="6" width="20" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                                            <line x1="6" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                            <line x1="6" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                        </>
                                    )}
                                </svg>
                            </div>
                        </div>
                        <span className="orient-sel__name">{orientationConfig[o].label}</span>
                        <span className="orient-sel__desc">{orientationConfig[o].desc}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
