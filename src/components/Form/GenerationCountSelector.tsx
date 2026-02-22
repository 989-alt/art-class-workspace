import './GenerationCountSelector.css';

interface GenerationCountSelectorProps {
    count: number;
    onCountChange: (count: number) => void;
    disabled: boolean;
}

const counts = [1, 2, 3];

export default function GenerationCountSelector({
    count,
    onCountChange,
    disabled
}: GenerationCountSelectorProps) {
    return (
        <div className="gen-count">
            <label className="gen-count__label">생성 개수</label>
            <div className="gen-count__options">
                {counts.map((c) => (
                    <button
                        key={c}
                        type="button"
                        className={`gen-count__btn ${count === c ? 'gen-count__btn--active' : ''}`}
                        onClick={() => onCountChange(c)}
                        disabled={disabled}
                    >
                        <span className="gen-count__number">{c}</span>
                        <span className="gen-count__unit">개</span>
                    </button>
                ))}
            </div>
            <p className="gen-count__hint">
                동일 설정으로 {count}개의 다른 스타일 도안을 생성합니다
            </p>
        </div>
    );
}
