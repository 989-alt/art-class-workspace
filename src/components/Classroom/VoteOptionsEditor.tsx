import { useState, useEffect } from 'react';
import type { VoteOptions } from '../../types/classroom';
import './VoteOptionsEditor.css';

interface VoteOptionsEditorProps {
    voteOptions: VoteOptions;
    onSave: (next: VoteOptions) => void;
    disabled?: boolean;
    defaultKeywords?: string[];
}

const MAX_KEYWORD_LEN = 15;
const KEYWORD_SLOTS = 5;

// Fixed palette and detail options for classroom voting. Keep these Korean
// strings here — they become the tallied vote values in Supabase.
export const FIXED_PALETTES: string[] = ['얇은 선', '보통', '굵은 선'];
export const FIXED_DETAILS: string[] = ['단순', '보통', '복잡'];

const L = {
    title: '투표 후보 설정',
    keywords: '키워드 후보 (5개)',
    palettes: '선 굵기 후보 (고정)',
    details: '디테일 후보 (고정)',
    save: '후보 저장',
    reset: '기본값으로 되돌리기',
    hintLen: '최대 15자',
    hint: '학생들이 이 중에서 하나를 투표합니다.',
};

function padKeywords(input: string[]): string[] {
    const next = [...input];
    while (next.length < KEYWORD_SLOTS) next.push('');
    return next.slice(0, KEYWORD_SLOTS);
}

export default function VoteOptionsEditor({
    voteOptions,
    onSave,
    disabled,
    defaultKeywords,
}: VoteOptionsEditorProps) {
    const [keywords, setKeywords] = useState<string[]>(padKeywords(voteOptions.keywords));

    useEffect(() => {
        setKeywords(padKeywords(voteOptions.keywords));
    }, [voteOptions.keywords]);

    const handleKeywordChange = (idx: number, value: string) => {
        setKeywords((prev) => {
            const next = [...prev];
            next[idx] = value.slice(0, MAX_KEYWORD_LEN);
            return next;
        });
    };

    const handleSave = () => {
        const cleaned = keywords
            .map((k) => k.trim())
            .filter((k) => k.length > 0)
            .slice(0, KEYWORD_SLOTS);
        onSave({
            keywords: cleaned,
            palettes: FIXED_PALETTES,
            details: FIXED_DETAILS,
        });
    };

    const handleReset = () => {
        if (defaultKeywords && defaultKeywords.length > 0) {
            setKeywords(padKeywords(defaultKeywords));
        }
    };

    return (
        <div className="vote-options-editor">
            <h3 className="vote-options-editor__title">{L.title}</h3>
            <p className="vote-options-editor__hint">{L.hint}</p>

            <section className="vote-options-editor__section">
                <label className="vote-options-editor__label">{L.keywords}</label>
                <div className="vote-options-editor__chips">
                    {keywords.map((kw, idx) => (
                        <input
                            key={idx}
                            className="vote-options-editor__chip"
                            type="text"
                            value={kw}
                            onChange={(e) => handleKeywordChange(idx, e.target.value)}
                            placeholder={`#${idx + 1}`}
                            maxLength={MAX_KEYWORD_LEN}
                            disabled={disabled}
                        />
                    ))}
                </div>
                <span className="vote-options-editor__muted">{L.hintLen}</span>
            </section>

            <section className="vote-options-editor__section">
                <label className="vote-options-editor__label">{L.palettes}</label>
                <div className="vote-options-editor__readonly-row">
                    {FIXED_PALETTES.map((p) => (
                        <span key={p} className="vote-options-editor__pill">
                            {p}
                        </span>
                    ))}
                </div>
            </section>

            <section className="vote-options-editor__section">
                <label className="vote-options-editor__label">{L.details}</label>
                <div className="vote-options-editor__readonly-row">
                    {FIXED_DETAILS.map((d) => (
                        <span key={d} className="vote-options-editor__pill">
                            {d}
                        </span>
                    ))}
                </div>
            </section>

            <div className="vote-options-editor__actions">
                <button
                    type="button"
                    className="vote-options-editor__btn vote-options-editor__btn--primary"
                    onClick={handleSave}
                    disabled={disabled}
                >
                    {L.save}
                </button>
                {defaultKeywords && defaultKeywords.length > 0 && (
                    <button
                        type="button"
                        className="vote-options-editor__btn"
                        onClick={handleReset}
                        disabled={disabled}
                    >
                        {L.reset}
                    </button>
                )}
            </div>
        </div>
    );
}
