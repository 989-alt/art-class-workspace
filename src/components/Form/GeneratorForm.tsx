import { useMemo, useState } from 'react';
import type { GenerationConfig, Mode, Difficulty, MandalaPreset, Orientation, PaperSize, ToastMessage } from '../../types';
import type { CurriculumPreset } from '../../types/curriculum';
import { CURRICULUM_PRESETS } from '../../data/curriculumPresets';
import ModeSelector from './ModeSelector';
import DifficultySlider from './DifficultySlider';
import OrientationSelector from './OrientationSelector';
import PaperSizeSelector from './PaperSizeSelector';
import GridSelector from './GridSelector';
import MandalaPresets from './MandalaPresets';
import CurriculumPresetPicker from './CurriculumPresetPicker';
import GenerationCountSelector from './GenerationCountSelector';
import './GeneratorForm.css';

interface GeneratorFormProps {
    isLoading: boolean;
    onGenerate: (config: GenerationConfig, count: number) => void;
    onToast?: (toast: ToastMessage) => void;
}

export default function GeneratorForm({ isLoading, onGenerate, onToast }: GeneratorFormProps) {
    const [mode, setMode] = useState<Mode>('free');
    const [topic, setTopic] = useState('');
    const [mandalaPreset, setMandalaPreset] = useState<MandalaPreset>('flower');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [orientation, setOrientation] = useState<Orientation>('vertical');
    const [paperSize, setPaperSize] = useState<PaperSize>('A4');
    const [gridN, setGridN] = useState(1);
    const [gridM, setGridM] = useState(1);
    const [generationCount, setGenerationCount] = useState(1);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    // Derive activePreset from selectedPresetId — single source of truth.
    const activePreset = useMemo<CurriculumPreset | null>(
        () => CURRICULUM_PRESETS.find((p) => p.id === selectedPresetId) ?? null,
        [selectedPresetId]
    );

    const handlePresetSelect = (preset: CurriculumPreset) => {
        // Re-clicking the same preset is a no-op — don't wipe manual slider adjustments.
        if (preset.id === selectedPresetId) return;

        setSelectedPresetId(preset.id);
        setSelectedTopic(null);
        setDifficulty(preset.difficulty);
        setOrientation(preset.defaultOrientation);
        setPaperSize(preset.defaultPaper);
        setGridN(preset.defaultGrid.n);
        setGridM(preset.defaultGrid.m);

        if (onToast) {
            onToast({
                id: `preset-applied-${Date.now()}`,
                type: 'success',
                message: '프리셋 기본값을 적용했습니다.',
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'free' && !topic.trim()) return;
        if (mode === 'curriculum' && !selectedPresetId) return;

        const resolvedTopic =
            mode === 'curriculum' && activePreset
                ? selectedTopic ?? activePreset.unitTitle
                : topic;

        const config: GenerationConfig = {
            mode,
            topic: resolvedTopic,
            mandalaPreset,
            difficulty,
            orientation,
            paperSize,
            gridN,
            gridM,
        };

        if (mode === 'curriculum') {
            config.presetId = selectedPresetId ?? undefined;
            config.selectedTopic = selectedTopic;
        }

        onGenerate(config, generationCount);
    };

    const canSubmit =
        mode === 'mandala' ||
        (mode === 'free' && topic.trim().length > 0) ||
        (mode === 'curriculum' && selectedPresetId !== null);

    return (
        <form className="gen-form" onSubmit={handleSubmit}>
            <h2 className="gen-form__title">도안 설정</h2>

            <ModeSelector mode={mode} onModeChange={setMode} disabled={isLoading} />

            {mode === 'free' && (
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

            {mode === 'mandala' && (
                <MandalaPresets
                    selected={mandalaPreset}
                    onSelect={setMandalaPreset}
                    disabled={isLoading}
                />
            )}

            {mode === 'curriculum' && (
                <CurriculumPresetPicker
                    selectedId={selectedPresetId}
                    onSelect={handlePresetSelect}
                    disabled={isLoading}
                    selectedTopic={selectedTopic}
                    onTopicChange={setSelectedTopic}
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
