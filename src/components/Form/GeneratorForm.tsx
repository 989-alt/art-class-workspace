import { useState } from 'react';
import type { GenerationConfig, Mode, Difficulty, MandalaPreset, Orientation, PaperSize, ArtStyle, CalligraphyFont } from '../../types';
import { CALLIGRAPHY_FONT_LABELS } from '../../types';
import ModeSelector from './ModeSelector';
import StyleSelector from './StyleSelector';
import DifficultySlider from './DifficultySlider';
import OrientationSelector from './OrientationSelector';
import PaperSizeSelector from './PaperSizeSelector';
import GridSelector from './GridSelector';
import MandalaPresets from './MandalaPresets';
import GenerationCountSelector from './GenerationCountSelector';
import './GeneratorForm.css';

interface GeneratorFormProps {
    isLoading: boolean;
    onGenerate: (config: GenerationConfig, count: number) => void;
}

export default function GeneratorForm({ isLoading, onGenerate }: GeneratorFormProps) {
    const [mode, setMode] = useState<Mode>('free');
    const [artStyle, setArtStyle] = useState<ArtStyle>('line-art');
    const [calligraphyText, setCalligraphyText] = useState('');
    const [topic, setTopic] = useState('');
    const [mandalaPreset, setMandalaPreset] = useState<MandalaPreset>('flower');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [orientation, setOrientation] = useState<Orientation>('vertical');
    const [paperSize, setPaperSize] = useState<PaperSize>('A4');
    const [gridN, setGridN] = useState(1);
    const [gridM, setGridM] = useState(1);
    const [generationCount, setGenerationCount] = useState(1);
    const [calligraphyFont, setCalligraphyFont] = useState<CalligraphyFont>('panbonche');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'free' && artStyle !== 'calligraphy' && !topic.trim()) return;
        if (mode === 'free' && artStyle === 'calligraphy' && !calligraphyText.trim()) return;

        onGenerate({
            mode,
            artStyle,
            calligraphyText: artStyle === 'calligraphy' ? calligraphyText : undefined,
            calligraphyFont: artStyle === 'calligraphy' ? calligraphyFont : undefined,
            topic,
            mandalaPreset,
            difficulty,
            orientation,
            paperSize,
            gridN,
            gridM
        }, generationCount);
    };

    const canSubmit = mode === 'mandala' ||
        (mode === 'free' && artStyle === 'calligraphy' && calligraphyText.trim().length > 0) ||
        (mode === 'free' && artStyle !== 'calligraphy' && topic.trim().length > 0);

    return (
        <form className="gen-form" onSubmit={handleSubmit}>
            <h2 className="gen-form__title">도안 설정</h2>

            <ModeSelector mode={mode} onModeChange={setMode} disabled={isLoading} />

            {mode === 'free' ? (
                <>
                    <StyleSelector artStyle={artStyle} onStyleChange={setArtStyle} disabled={isLoading} />

                    {artStyle === 'calligraphy' ? (
                        <>
                            <div className="gen-form__field">
                                <label className="gen-form__label">서체 선택</label>
                                <div className="gen-form__font-selector">
                                    {(Object.entries(CALLIGRAPHY_FONT_LABELS) as [CalligraphyFont, string][]).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            className={`gen-form__font-btn ${calligraphyFont === key ? 'gen-form__font-btn--active' : ''}`}
                                            onClick={() => setCalligraphyFont(key)}
                                            disabled={isLoading}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="gen-form__field">
                                <label className="gen-form__label">생성할 글자나 낱말</label>
                                <input
                                    className="gen-form__input"
                                    type="text"
                                    placeholder="예: 사랑, 평화, 봄날..."
                                    value={calligraphyText}
                                    onChange={(e) => setCalligraphyText(e.target.value)}
                                    disabled={isLoading}
                                    maxLength={20}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="gen-form__field">
                            <label className="gen-form__label">주제 입력</label>
                            <input
                                className="gen-form__input"
                                type="text"
                                placeholder="예: 사과 바구니, 봄 풍경, 우주선..."
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={isLoading}
                                maxLength={100}
                            />
                        </div>
                    )}
                </>
            ) : (
                <MandalaPresets
                    selected={mandalaPreset}
                    onSelect={setMandalaPreset}
                    disabled={isLoading}
                />
            )}

            <DifficultySlider
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                disabled={isLoading}
            />

            <OrientationSelector
                orientation={orientation}
                onOrientationChange={setOrientation}
                disabled={isLoading}
            />

            <PaperSizeSelector
                paperSize={paperSize}
                onPaperSizeChange={setPaperSize}
                disabled={isLoading}
            />

            <GridSelector
                gridN={gridN}
                gridM={gridM}
                orientation={orientation}
                paperSize={paperSize}
                onGridNChange={setGridN}
                onGridMChange={setGridM}
                disabled={isLoading}
            />

            <GenerationCountSelector
                count={generationCount}
                onCountChange={setGenerationCount}
                disabled={isLoading}
            />

            <button
                className="gen-form__submit"
                type="submit"
                disabled={isLoading || !canSubmit}
            >
                {isLoading ? (
                    <>
                        <span className="spinner" /> 생성 중...
                    </>
                ) : (
                    '🎨 도안 생성'
                )}
            </button>
        </form>
    );
}
