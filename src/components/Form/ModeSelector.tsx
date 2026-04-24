import type { Mode } from '../../types';
import './ModeSelector.css';

interface ModeSelectorProps {
    mode: Mode;
    onModeChange: (mode: Mode) => void;
    disabled: boolean;
}

export default function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
    return (
        <div className="mode-sel">
            <label className="mode-sel__label">모드 선택</label>
            <div className="mode-sel__tabs">
                <button
                    type="button"
                    className={`mode-sel__tab ${mode === 'free' ? 'mode-sel__tab--active' : ''}`}
                    onClick={() => onModeChange('free')}
                    disabled={disabled}
                >
                    ✏️ 자유 주제
                </button>
                <button
                    type="button"
                    className={`mode-sel__tab ${mode === 'mandala' ? 'mode-sel__tab--active' : ''}`}
                    onClick={() => onModeChange('mandala')}
                    disabled={disabled}
                >
                    🔮 만다라
                </button>
                <button
                    type="button"
                    className={`mode-sel__tab ${mode === 'curriculum' ? 'mode-sel__tab--active' : ''}`}
                    onClick={() => onModeChange('curriculum')}
                    disabled={disabled}
                >
                    📚 교과서
                </button>
            </div>
        </div>
    );
}
