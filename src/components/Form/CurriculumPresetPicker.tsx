import { useMemo, useState } from 'react';
import { CURRICULUM_PRESETS } from '../../data/curriculumPresets';
import type { CurriculumPreset, Grade, Subject } from '../../types/curriculum';
import { DIFFICULTY_LABELS } from '../../types';
import './CurriculumPresetPicker.css';

interface CurriculumPresetPickerProps {
    selectedId: string | null;
    onSelect: (preset: CurriculumPreset) => void;
    disabled: boolean;
    selectedTopic: string | null;
    onTopicChange: (topic: string | null) => void;
}

type GradeFilter = Grade | 'all';
type SubjectFilter = Subject | 'all';

const GRADE_OPTIONS: { value: GradeFilter; label: string }[] = [
    { value: 'all', label: '공통' },
    { value: 1, label: '1학년' },
    { value: 2, label: '2학년' },
    { value: 3, label: '3학년' },
    { value: 4, label: '4학년' },
    { value: 5, label: '5학년' },
    { value: 6, label: '6학년' },
];

const SUBJECT_OPTIONS: { value: SubjectFilter; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: '국어', label: '국어' },
    { value: '사회', label: '사회' },
    { value: '과학', label: '과학' },
    { value: '미술', label: '미술' },
    { value: '도덕', label: '도덕' },
    { value: '실과', label: '실과' },
];

function isCommonPreset(preset: CurriculumPreset): boolean {
    return preset.isCommon === true;
}

export default function CurriculumPresetPicker({
    selectedId,
    onSelect,
    disabled,
    selectedTopic,
    onTopicChange,
}: CurriculumPresetPickerProps) {
    const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all');
    const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
    const [noteOpen, setNoteOpen] = useState(false);

    const filteredPresets = useMemo(() => {
        return CURRICULUM_PRESETS.filter((preset) => {
            if (gradeFilter === 'all') {
                // "공통" filter shows only all-grades-common presets (isCommon === true).
                if (!isCommonPreset(preset)) return false;
            } else {
                // Specific grade: always include common presets + that grade's presets.
                if (isCommonPreset(preset)) return true;
                if (preset.grade !== gradeFilter) return false;
            }
            if (subjectFilter !== 'all' && preset.subject !== subjectFilter) return false;
            return true;
        });
    }, [gradeFilter, subjectFilter]);

    // Count matches per grade filter so we can dim chips that would show zero presets.
    const gradeMatchCounts = useMemo(() => {
        const counts = new Map<GradeFilter, number>();
        for (const opt of GRADE_OPTIONS) {
            const count = CURRICULUM_PRESETS.filter((preset) => {
                if (opt.value === 'all') {
                    if (!isCommonPreset(preset)) return false;
                } else {
                    if (isCommonPreset(preset)) return true;
                    if (preset.grade !== opt.value) return false;
                }
                if (subjectFilter !== 'all' && preset.subject !== subjectFilter) return false;
                return true;
            }).length;
            counts.set(opt.value, count);
        }
        return counts;
    }, [subjectFilter]);

    const selectedPreset = useMemo(
        () => CURRICULUM_PRESETS.find((p) => p.id === selectedId) ?? null,
        [selectedId]
    );

    const handleTopicClick = (topic: string) => {
        if (selectedTopic === topic) {
            onTopicChange(null);
        } else {
            onTopicChange(topic);
        }
    };

    return (
        <div className="curriculum-picker">
            <label className="curriculum-picker__label">교과서 단원 선택</label>

            <div className="curriculum-picker__filters">
                <div className="curriculum-picker__filter-row">
                    <span className="curriculum-picker__filter-title">학년</span>
                    <div className="curriculum-picker__chips">
                        {GRADE_OPTIONS.map((opt) => {
                            const isEmpty = (gradeMatchCounts.get(opt.value) ?? 0) === 0;
                            const isDisabled = disabled || isEmpty;
                            return (
                                <button
                                    key={String(opt.value)}
                                    type="button"
                                    className={`curriculum-picker__filter-chip ${
                                        gradeFilter === opt.value
                                            ? 'curriculum-picker__filter-chip--active'
                                            : ''
                                    } ${isEmpty ? 'curriculum-picker__filter-chip--empty' : ''}`}
                                    onClick={() => setGradeFilter(opt.value)}
                                    disabled={isDisabled}
                                    aria-disabled={isDisabled}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="curriculum-picker__filter-row">
                    <span className="curriculum-picker__filter-title">과목</span>
                    <div className="curriculum-picker__chips">
                        {SUBJECT_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                className={`curriculum-picker__filter-chip ${
                                    subjectFilter === opt.value
                                        ? 'curriculum-picker__filter-chip--active'
                                        : ''
                                }`}
                                onClick={() => setSubjectFilter(opt.value)}
                                disabled={disabled}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {filteredPresets.length === 0 ? (
                <div className="curriculum-picker__empty">
                    조건에 맞는 단원이 없습니다. 필터를 조정해 보세요.
                </div>
            ) : (
                <div className="curriculum-picker__grid">
                    {filteredPresets.map((preset) => {
                        const isSelected = selectedId === preset.id;
                        const gradeSemBadge = isCommonPreset(preset)
                            ? '공통'
                            : `${preset.grade}-${preset.semester}`;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={`curriculum-picker__card ${
                                    isSelected ? 'curriculum-picker__card--selected' : ''
                                }`}
                                onClick={() => onSelect(preset)}
                                disabled={disabled}
                            >
                                <div className="curriculum-picker__card-head">
                                    <span className="curriculum-picker__emoji">
                                        {preset.thumbnailEmoji}
                                    </span>
                                    <span className="curriculum-picker__badge">
                                        {gradeSemBadge}
                                    </span>
                                </div>
                                <div className="curriculum-picker__subject">{preset.subject}</div>
                                <div className="curriculum-picker__title">{preset.unitTitle}</div>
                                <div
                                    className={`curriculum-picker__difficulty curriculum-picker__difficulty--${preset.difficulty}`}
                                >
                                    {DIFFICULTY_LABELS[preset.difficulty]}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {selectedPreset && (
                <div className="curriculum-picker__detail">
                    <div className="curriculum-picker__topics">
                        <span className="curriculum-picker__detail-title">
                            세부 주제 (선택 사항)
                        </span>
                        <div className="curriculum-picker__topic-chips">
                            {selectedPreset.suggestedTopics.map((topic) => (
                                <button
                                    key={topic}
                                    type="button"
                                    className={`curriculum-picker__topic-chip ${
                                        selectedTopic === topic
                                            ? 'curriculum-picker__topic-chip--active'
                                            : ''
                                    }`}
                                    onClick={() => handleTopicClick(topic)}
                                    disabled={disabled}
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="curriculum-picker__note-toggle"
                        onClick={() => setNoteOpen((v) => !v)}
                        disabled={disabled}
                    >
                        <span>💡 수업 안내 {noteOpen ? '접기' : '펼치기'}</span>
                        <span className="curriculum-picker__note-arrow">
                            {noteOpen ? '▲' : '▼'}
                        </span>
                    </button>
                    {noteOpen && (
                        <div className="curriculum-picker__note-body">
                            <p className="curriculum-picker__note-text">
                                {selectedPreset.teachingNote}
                            </p>
                            <div className="curriculum-picker__objectives">
                                <span className="curriculum-picker__detail-title">
                                    학습 목표
                                </span>
                                <ul className="curriculum-picker__objective-list">
                                    {selectedPreset.learningObjectives.map((obj) => (
                                        <li key={obj}>{obj}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="curriculum-picker__meta">
                                <span>단원 코드: {selectedPreset.unitCode}</span>
                                <span>예상 차시: 약 {selectedPreset.timeEstimate}분</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
