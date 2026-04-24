import { useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { isValidSessionCode } from '../../lib/sessionCode';
import { clearStudentToken } from '../../lib/studentToken';
import { useStudentSession } from '../../hooks/useStudentSession';
import { CURRICULUM_PRESETS } from '../../data/curriculumPresets';
import './StudentVoteView.css';

interface StudentVoteViewProps {
    sessionCode: string;
}

const L = {
    brand: 'AI 미술실',
    sessionLabel: '세션 코드',
    loading: '세션을 찾는 중...',
    notConfigured: '이 기능은 현재 사용할 수 없습니다. 선생님께 문의해주세요.',
    notFoundTitle: '세션을 찾을 수 없어요',
    notFoundMsg: '코드가 정확한지 선생님께 확인해주세요.',
    invalidCodeTitle: '잘못된 코드입니다',
    invalidCodeMsg: '6자리 세션 코드를 다시 확인해 주세요.',
    errorTitle: '문제가 발생했습니다',
    retry: '다시 시도',
    goHome: '뒤로 가기',
    heroTitle: '오늘의 도안을 함께 만들어요',
    heroSubtitle: '키워드, 선 굵기, 디테일을 각각 하나씩 골라주세요.',
    nickname: '닉네임 (선택)',
    nicknamePlaceholder: '예) 민서',
    keywords: '1. 어떤 주제로 그릴까요?',
    palettes: '2. 선 굵기는 어떻게 할까요?',
    details: '3. 얼마나 자세하게 그릴까요?',
    submit: '제출하기',
    submitting: '제출 중...',
    submittedTitle: '제출 완료!',
    submittedSubtitle: '선생님이 투표를 마감할 때까지 기다려주세요.',
    submittedEchoKeyword: '주제',
    submittedEchoPalette: '선 굵기',
    submittedEchoDetail: '디테일',
    generatingTitle: '선생님이 도안을 만들고 있어요',
    generatingSubtitle: '잠시만 기다려주세요.',
    closedTitle: '세션이 종료되었습니다',
    closedSubtitle: '선생님께 문의해주세요.',
    resultTitle: '우리 반 공동 도안이 완성됐어요!',
    download: 'PNG 다운로드',
    restart: '다시 참여하기',
    selectionRequired: '세 가지 모두 선택해주세요',
};

const DEFAULT_NICKNAME_EMOJIS = ['🐼', '🦊', '🐨', '🦁', '🐯', '🐸', '🐧', '🐰', '🦄', '🐻'];

function pickDefaultNickname(): string {
    const emoji = DEFAULT_NICKNAME_EMOJIS[Math.floor(Math.random() * DEFAULT_NICKNAME_EMOJIS.length)];
    return `학생${emoji}`;
}

function deriveUnitLabel(presetId: string | null | undefined): string | null {
    if (!presetId) return null;
    const preset = CURRICULUM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return null;
    return `${preset.grade}-${preset.semester} ${preset.subject} · ${preset.unitTitle}`;
}

function goHome(): void {
    if (typeof window === 'undefined') return;
    // Strip the /session/:code suffix and go to the app root.
    const base = window.location.pathname.replace(/\/session\/[A-HJ-NP-Z2-9]{6}\/?$/i, '/');
    window.history.pushState({}, '', base || '/');
    // Trigger popstate listeners (App.tsx listens for this to re-render).
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function StudentVoteView({ sessionCode }: StudentVoteViewProps) {
    const codeIsValid = isValidSessionCode(sessionCode);
    const configured = isSupabaseConfigured();

    // Always call the hook to keep hook order stable, even if we don't render
    // its output below (invalid code / not configured).
    const safeCode = codeIsValid ? sessionCode : 'XXXXXX';
    const {
        session,
        status,
        loadError,
        isSubmitting,
        hasSubmitted,
        submitVote,
        reload,
    } = useStudentSession(safeCode);

    const [nickname, setNickname] = useState<string>('');
    const [keyword, setKeyword] = useState<string | null>(null);
    const [palette, setPalette] = useState<string | null>(null);
    const [detail, setDetail] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    // Retain the student's echo even after server state changes.
    const submittedEchoRef = useRef<{ keyword: string; palette: string; detail: string } | null>(
        null
    );

    // Focus the first pill group title when transitioning between major states.
    const statusAnnouncementRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (statusAnnouncementRef.current) {
            statusAnnouncementRef.current.focus();
        }
    }, [status, hasSubmitted]);

    const unitLabel = useMemo(
        () => deriveUnitLabel(session?.preset_id ?? null),
        [session?.preset_id]
    );

    const voteOptions = session?.vote_options ?? null;

    // Early: Supabase not configured
    if (!configured) {
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <div className="student-view__error-card" role="alert">
                        <div className="student-view__error-emoji">🔌</div>
                        <h2 className="student-view__error-title">{L.errorTitle}</h2>
                        <p className="student-view__error-message">{L.notConfigured}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Early: invalid code format
    if (!codeIsValid) {
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <div className="student-view__error-card" role="alert">
                        <div className="student-view__error-emoji">⚠️</div>
                        <h2 className="student-view__error-title">{L.invalidCodeTitle}</h2>
                        <p className="student-view__error-message">{L.invalidCodeMsg}</p>
                        <div className="student-view__error-actions">
                            <button className="student-view__back-link" onClick={goHome}>
                                {L.goHome}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <div
                        className="student-view__waiting"
                        ref={statusAnnouncementRef}
                        tabIndex={-1}
                        aria-live="polite"
                    >
                        <div className="student-view__spinner" aria-hidden="true" />
                        <p className="student-view__waiting-subtitle">{L.loading}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Load error / session missing
    if (loadError || status === 'missing' || !session) {
        const isMissing = status === 'missing' || loadError?.includes('찾을 수');
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <div className="student-view__error-card" role="alert">
                        <div className="student-view__error-emoji">{isMissing ? '🔍' : '⚠️'}</div>
                        <h2 className="student-view__error-title">
                            {isMissing ? L.notFoundTitle : L.errorTitle}
                        </h2>
                        <p className="student-view__error-message">
                            {isMissing ? L.notFoundMsg : loadError || L.notFoundMsg}
                        </p>
                        <div className="student-view__error-actions">
                            <button className="student-view__retry-btn" onClick={reload}>
                                {L.retry}
                            </button>
                            <button className="student-view__back-link" onClick={goHome}>
                                {L.goHome}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async (): Promise<void> => {
        if (!keyword || !palette || !detail) {
            setSubmitError(L.selectionRequired);
            return;
        }
        setSubmitError(null);
        try {
            const finalNickname = nickname.trim() || pickDefaultNickname();
            await submitVote({
                vote_keyword: keyword,
                vote_palette: palette,
                vote_detail: detail,
                nickname: finalNickname,
            });
            submittedEchoRef.current = { keyword, palette, detail };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setSubmitError(msg);
        }
    };

    const handleRestart = (): void => {
        clearStudentToken(sessionCode);
        goHome();
    };

    // --- STATE D: complete ---
    if (session.status === 'complete' && session.final_image_url) {
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <section
                        className="student-view__result"
                        ref={statusAnnouncementRef}
                        tabIndex={-1}
                        aria-live="polite"
                    >
                        <h1 className="student-view__result-title">{L.resultTitle}</h1>
                        <img
                            className="student-view__result-image"
                            src={session.final_image_url}
                            alt="우리 반 공동 도안"
                        />
                        <div className="student-view__result-actions">
                            <a
                                className="student-view__download-btn"
                                href={session.final_image_url}
                                download="도안.png"
                            >
                                ⬇️ {L.download}
                            </a>
                            <button
                                className="student-view__restart-btn"
                                onClick={handleRestart}
                            >
                                {L.restart}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    // --- STATE B / C / misc ---
    // "closed" -> treat as an end-state message
    if (session.status === 'closed') {
        return (
            <div className="student-view">
                <div className="student-view__container">
                    <div className="student-view__error-card" role="alert">
                        <div className="student-view__error-emoji">🔒</div>
                        <h2 className="student-view__error-title">{L.closedTitle}</h2>
                        <p className="student-view__error-message">{L.closedSubtitle}</p>
                        <div className="student-view__error-actions">
                            <button className="student-view__back-link" onClick={goHome}>
                                {L.goHome}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Topbar shared by remaining states
    const topbar = (
        <div className="student-view__topbar">
            <div>
                <div className="student-view__code-label">{L.sessionLabel}</div>
                <div className="student-view__code" aria-label={`${L.sessionLabel} ${session.code}`}>
                    {session.code}
                </div>
            </div>
            {unitLabel && <div className="student-view__unit">{unitLabel}</div>}
        </div>
    );

    // --- STATE C: already submitted — waiting ---
    if (hasSubmitted) {
        const echo = submittedEchoRef.current;
        return (
            <div className="student-view">
                <div className="student-view__container">
                    {topbar}
                    <section
                        className="student-view__card"
                        ref={statusAnnouncementRef}
                        tabIndex={-1}
                        aria-live="polite"
                    >
                        <div className="student-view__waiting">
                            <div className="student-view__check" aria-hidden="true">✓</div>
                            <h2 className="student-view__waiting-title">
                                {session.status === 'generating' ? L.generatingTitle : L.submittedTitle}
                            </h2>
                            <p className="student-view__waiting-subtitle">
                                {session.status === 'generating'
                                    ? L.generatingSubtitle
                                    : L.submittedSubtitle}
                            </p>
                            {echo && (
                                <div className="student-view__echo">
                                    <div className="student-view__echo-row">
                                        <span className="student-view__echo-key">
                                            {L.submittedEchoKeyword}
                                        </span>
                                        <span className="student-view__echo-value">{echo.keyword}</span>
                                    </div>
                                    <div className="student-view__echo-row">
                                        <span className="student-view__echo-key">
                                            {L.submittedEchoPalette}
                                        </span>
                                        <span className="student-view__echo-value">{echo.palette}</span>
                                    </div>
                                    <div className="student-view__echo-row">
                                        <span className="student-view__echo-key">
                                            {L.submittedEchoDetail}
                                        </span>
                                        <span className="student-view__echo-value">{echo.detail}</span>
                                    </div>
                                </div>
                            )}
                            <div className="student-view__spinner" aria-hidden="true" />
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    // --- STATE B: voting form ---
    if (session.status === 'generating') {
        // Late-arrivers (refresh while teacher is generating). Show waiting card.
        return (
            <div className="student-view">
                <div className="student-view__container">
                    {topbar}
                    <section
                        className="student-view__card"
                        ref={statusAnnouncementRef}
                        tabIndex={-1}
                        aria-live="polite"
                    >
                        <div className="student-view__waiting">
                            <div className="student-view__spinner" aria-hidden="true" />
                            <h2 className="student-view__waiting-title">{L.generatingTitle}</h2>
                            <p className="student-view__waiting-subtitle">
                                {L.generatingSubtitle}
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    const canSubmit = !!(keyword && palette && detail) && !isSubmitting;
    const keywords = voteOptions?.keywords ?? [];
    const palettes = voteOptions?.palettes ?? [];
    const details = voteOptions?.details ?? [];

    return (
        <div className="student-view">
            <div className="student-view__container">
                {topbar}
                <div
                    className="student-view__hero"
                    ref={statusAnnouncementRef}
                    tabIndex={-1}
                >
                    <div className="student-view__hero-emoji">🎨</div>
                    <h1 className="student-view__hero-title">{L.heroTitle}</h1>
                    <p className="student-view__hero-subtitle">{L.heroSubtitle}</p>
                </div>

                <section className="student-view__card">
                    <div className="student-view__field">
                        <label className="student-view__label" htmlFor="student-nickname">
                            {L.nickname}
                        </label>
                        <input
                            id="student-nickname"
                            className="student-view__nickname-input"
                            type="text"
                            placeholder={L.nicknamePlaceholder}
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value.slice(0, 16))}
                            maxLength={16}
                            autoComplete="off"
                        />
                    </div>

                    <div className="student-view__group" role="radiogroup" aria-label={L.keywords}>
                        <h3 className="student-view__group-title">{L.keywords}</h3>
                        <div className="student-view__pills">
                            {keywords.map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="radio"
                                    aria-checked={keyword === k}
                                    className={`student-view__pill${
                                        keyword === k ? ' student-view__pill--active' : ''
                                    }`}
                                    onClick={() => setKeyword(k)}
                                    disabled={isSubmitting}
                                >
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="student-view__group" role="radiogroup" aria-label={L.palettes}>
                        <h3 className="student-view__group-title">{L.palettes}</h3>
                        <div className="student-view__pills">
                            {palettes.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={palette === p}
                                    className={`student-view__pill${
                                        palette === p ? ' student-view__pill--active' : ''
                                    }`}
                                    onClick={() => setPalette(p)}
                                    disabled={isSubmitting}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="student-view__group" role="radiogroup" aria-label={L.details}>
                        <h3 className="student-view__group-title">{L.details}</h3>
                        <div className="student-view__pills">
                            {details.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    role="radio"
                                    aria-checked={detail === d}
                                    className={`student-view__pill${
                                        detail === d ? ' student-view__pill--active' : ''
                                    }`}
                                    onClick={() => setDetail(d)}
                                    disabled={isSubmitting}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {submitError && (
                        <p
                            className="student-view__waiting-subtitle"
                            role="alert"
                            style={{ color: '#A66B47' }}
                        >
                            {submitError}
                        </p>
                    )}

                    <button
                        className="student-view__submit"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        {isSubmitting ? L.submitting : L.submit}
                    </button>
                </section>
            </div>
        </div>
    );
}
