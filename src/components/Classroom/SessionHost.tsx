import { useEffect, useMemo, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import type { User } from '@supabase/supabase-js';
import type { GalleryItem, GenerationConfig, ToastMessage } from '../../types';
import type { VoteOptions, ClassroomSession } from '../../types/classroom';
import type { CurriculumPreset } from '../../types/curriculum';
import { CURRICULUM_PRESETS } from '../../data/curriculumPresets';
import { useClassroomSession } from '../../hooks/useClassroomSession';
import { composeVotedPrompt } from '../../services/voteToPrompt';
import { generateImage, SafetyFilterError } from '../../services/geminiService';
import { calculateAspectRatio } from '../../utils/aspectRatio';
import VoteOptionsEditor, { FIXED_PALETTES, FIXED_DETAILS } from './VoteOptionsEditor';
import VoteDashboard from './VoteDashboard';
import TeacherReviewPanel from './TeacherReviewPanel';
import ClassGallery from './ClassGallery';
import { getTeacherName, DEFAULT_TEACHER_NAME } from '../../utils/teacherProfile';
import './SessionHost.css';

interface SessionHostProps {
    config: GenerationConfig;
    apiKey: string;
    user: User;
    onToast: (toast: ToastMessage) => void;
    onComplete: (item: GalleryItem) => void;
    onExit: () => void;
}

const L = {
    back: '← 생성기로 돌아가기',
    startTitle: '학급 세션 준비',
    startSubtitle: '학생들이 투표할 후보를 확인한 뒤 세션을 시작하세요.',
    startBtn: '📡 학급 세션 시작',
    starting: '시작 중...',
    sessionCode: '세션 코드',
    scanHint: '학생은 QR을 스캔하거나 코드를 입력해 참여합니다.',
    studentUrl: '학생 접속 URL',
    statusVoting: '투표 진행 중',
    statusGenerating: '도안 생성 중',
    statusComplete: '완료됨',
    statusClosed: '종료됨',
    closeVote: '🔒 투표 마감 + 도안 생성',
    closing: '생성 중...',
    endSession: '🗑️ 세션 종료',
    noVotesYet: '아직 투표가 없어 도안 생성을 할 수 없습니다.',
    errorSafety: '⚠️ 안전 정책에 의해 이미지 생성이 차단되었습니다.',
    errorGenerate: '도안 생성에 실패했습니다. 다시 시도해 주세요.',
    completeTitle: '✨ 학급 공동 도안이 완성되었습니다!',
    completeHint: '갤러리에 저장되었습니다. 편집 및 인쇄가 가능합니다.',
    promptBlock: '최종 프롬프트',
    finishBtn: '갤러리에서 보기',
    confirmEnd: '세션을 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    statusError: '오류',
    qrAltPrefix: '세션 코드',
    qrAltSuffix: 'QR 코드',
};

function statusLabel(status: ClassroomSession['status']): string {
    switch (status) {
        case 'voting':
            return L.statusVoting;
        case 'generating':
            return L.statusGenerating;
        case 'complete':
            return L.statusComplete;
        case 'closed':
            return L.statusClosed;
        default:
            return status;
    }
}

function generateGalleryId(): string {
    return `session-${crypto.randomUUID()}`;
}

export default function SessionHost({
    config,
    apiKey,
    user,
    onToast,
    onComplete,
    onExit,
}: SessionHostProps) {
    const preset = useMemo<CurriculumPreset | null>(
        () => CURRICULUM_PRESETS.find((p) => p.id === config.presetId) ?? null,
        [config.presetId]
    );

    const {
        session,
        aggregation,
        isCreating,
        createSession,
        updateVoteOptions,
        closeSession,
        reopenSession,
        setFinalImage,
        clearSession,
    } = useClassroomSession();

    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [finalImage, setFinalImageLocal] = useState<string | null>(null);
    const [finalPrompt, setFinalPromptLocal] = useState<string | null>(null);

    const voteOptions = session?.vote_options ?? null;

    // Seed vote options from the preset on first render when no session yet.
    const defaultVoteOptions = useMemo<VoteOptions>(() => {
        const seedKeywords = preset?.suggestedTopics?.slice(0, 5) ?? [];
        return {
            keywords: seedKeywords,
            palettes: FIXED_PALETTES,
            details: FIXED_DETAILS,
        };
    }, [preset]);

    const [draftOptions, setDraftOptions] = useState<VoteOptions>(defaultVoteOptions);
    useEffect(() => {
        setDraftOptions(defaultVoteOptions);
    }, [defaultVoteOptions]);

    // Build the student URL. Task 6 will implement /session/:code.
    const studentUrl = useMemo(() => {
        if (!session) return '';
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        return `${base}/session/${session.code}`;
    }, [session]);

    // Render QR to a data URL whenever the code changes.
    useEffect(() => {
        if (!session || !studentUrl) {
            setQrDataUrl(null);
            return;
        }
        let cancelled = false;
        QRCode.toDataURL(studentUrl, {
            width: 240,
            margin: 1,
            color: { dark: '#111111', light: '#ffffff' },
        })
            .then((url) => {
                if (!cancelled) setQrDataUrl(url);
            })
            .catch(() => {
                if (!cancelled) setQrDataUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [session, studentUrl]);

    const handleStart = useCallback(async () => {
        if (!preset) return;
        try {
            await createSession(preset.id, draftOptions, user.id);
            onToast({
                id: `session-start-${Date.now()}`,
                type: 'success',
                message: '학급 세션이 시작되었습니다.',
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            onToast({ id: `session-start-err-${Date.now()}`, type: 'error', message: msg });
        }
    }, [preset, draftOptions, user.id, createSession, onToast]);

    const handleSaveOptions = useCallback(
        async (next: VoteOptions) => {
            if (!session) {
                setDraftOptions(next);
                return;
            }
            try {
                await updateVoteOptions(session.id, next);
                onToast({
                    id: `opts-saved-${Date.now()}`,
                    type: 'success',
                    message: '후보 설정을 저장했습니다.',
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                onToast({ id: `opts-err-${Date.now()}`, type: 'error', message: msg });
            }
        },
        [session, updateVoteOptions, onToast]
    );

    const handleCloseAndGenerate = useCallback(async () => {
        if (!session || !preset || aggregation.total === 0) return;
        setIsGenerating(true);
        let closed = false;
        try {
            await closeSession(session.id);
            closed = true;
            const composedPrompt = composeVotedPrompt(preset, aggregation);
            const aspectRatio = calculateAspectRatio(
                config.gridN,
                config.gridM,
                config.orientation,
                config.paperSize
            );
            try {
                const imageData = await generateImage(apiKey, composedPrompt, { aspectRatio });
                setFinalImageLocal(imageData);
                setFinalPromptLocal(composedPrompt);

                // Persist to Supabase (final_image_url stores the data URL / later
                // Task 7 swaps to Storage URLs).
                await setFinalImage(session.id, composedPrompt, imageData);

                // Push to gallery so the teacher can edit/print immediately.
                const item: GalleryItem = {
                    id: generateGalleryId(),
                    image: imageData,
                    config,
                    createdAt: Date.now(),
                    prompt: composedPrompt,
                };
                onComplete(item);
                onToast({
                    id: `session-complete-${Date.now()}`,
                    type: 'success',
                    message: '✨ 학급 공동 도안이 완성되었습니다!',
                });
            } catch (innerErr) {
                // Rollback: image generation failed, but we already flipped
                // status to 'generating'. Return session to 'voting' so the
                // teacher can retry without being stuck.
                if (closed) {
                    try {
                        await reopenSession(session.id);
                    } catch {
                        // Ignore rollback failure; the generation error below
                        // is more actionable for the teacher.
                    }
                }
                throw innerErr;
            }
        } catch (err) {
            let msg = L.errorGenerate;
            if (err instanceof SafetyFilterError) msg = L.errorSafety;
            else if (err instanceof Error) msg = err.message;
            onToast({ id: `session-fail-${Date.now()}`, type: 'error', message: msg });
        } finally {
            setIsGenerating(false);
        }
    }, [
        session,
        preset,
        aggregation,
        config,
        apiKey,
        closeSession,
        reopenSession,
        setFinalImage,
        onComplete,
        onToast,
    ]);

    const handleEndSession = useCallback(() => {
        if (typeof window !== 'undefined' && !window.confirm(L.confirmEnd)) return;
        clearSession();
        setFinalImageLocal(null);
        setFinalPromptLocal(null);
        onExit();
    }, [clearSession, onExit]);

    if (!preset) {
        return (
            <div className="session-host">
                <div className="session-host__card">
                    <p>{'프리셋을 찾을 수 없습니다.'}</p>
                    <button className="session-host__exit" onClick={onExit}>
                        {L.back}
                    </button>
                </div>
            </div>
        );
    }

    // Pre-session: show preset info + vote options editor + "start" button.
    if (!session) {
        return (
            <div className="session-host">
                <header className="session-host__header">
                    <div>
                        <h2 className="session-host__title">{L.startTitle}</h2>
                        <p className="session-host__subtitle">{L.startSubtitle}</p>
                    </div>
                    <button className="session-host__exit" onClick={onExit}>
                        {L.back}
                    </button>
                </header>

                <div className="session-host__preset-card">
                    <div className="session-host__preset-emoji">{preset.thumbnailEmoji}</div>
                    <div>
                        <div className="session-host__preset-code">{preset.unitCode}</div>
                        <div className="session-host__preset-title">{preset.unitTitle}</div>
                    </div>
                </div>

                <VoteOptionsEditor
                    voteOptions={draftOptions}
                    onSave={setDraftOptions}
                    defaultKeywords={preset.suggestedTopics}
                />

                <button
                    className="session-host__start-btn"
                    onClick={handleStart}
                    disabled={isCreating || draftOptions.keywords.length === 0}
                >
                    {isCreating ? L.starting : L.startBtn}
                </button>
            </div>
        );
    }

    const votingActive = session.status === 'voting';
    const hasVotes = aggregation.total > 0;

    return (
        <div className="session-host">
            <header className="session-host__header">
                <div>
                    <h2 className="session-host__title">
                        {preset.thumbnailEmoji} {preset.unitTitle}
                    </h2>
                    <div className="session-host__status">
                        <span className={`session-host__status-pill session-host__status-pill--${session.status}`}>
                            {statusLabel(session.status)}
                        </span>
                    </div>
                </div>
                <button className="session-host__exit" onClick={handleEndSession}>
                    {L.endSession}
                </button>
            </header>

            <section className="session-host__code-row">
                <div className="session-host__code-block">
                    <div className="session-host__code-label">{L.sessionCode}</div>
                    <div
                        className="session-host__code"
                        aria-live="polite"
                        aria-label={`${L.qrAltPrefix} ${session.code}`}
                    >
                        {session.code}
                    </div>
                    <div className="session-host__url">{L.studentUrl}: {studentUrl}</div>
                    <p className="session-host__code-hint">{L.scanHint}</p>
                </div>
                <div className="session-host__qr-block">
                    {qrDataUrl ? (
                        <img
                            className="session-host__qr"
                            src={qrDataUrl}
                            alt={`${L.qrAltPrefix} ${session.code} ${L.qrAltSuffix}`}
                            width={200}
                            height={200}
                        />
                    ) : (
                        <div className="session-host__qr session-host__qr--placeholder" />
                    )}
                </div>
            </section>

            {finalImage && session.status === 'complete' ? (
                <section className="session-host__complete">
                    <h3 className="session-host__complete-title">{L.completeTitle}</h3>
                    <p className="session-host__complete-hint">{L.completeHint}</p>
                    <img className="session-host__complete-image" src={finalImage} alt="class artwork" />
                    {finalPrompt && (
                        <details className="session-host__complete-prompt">
                            <summary>{L.promptBlock}</summary>
                            <pre>{finalPrompt}</pre>
                        </details>
                    )}
                    <div className="session-host__complete-actions">
                        <button className="session-host__start-btn" onClick={onExit}>
                            {L.finishBtn}
                        </button>
                    </div>
                    <TeacherReviewPanel sessionId={session.id} />
                    <ClassGallery
                        sessionId={session.id}
                        sessionCode={session.code}
                        unitTitle={preset.unitTitle}
                        unitCode={preset.unitCode}
                        teacherName={
                            (() => {
                                const t = getTeacherName();
                                return t && t !== DEFAULT_TEACHER_NAME ? t : null;
                            })()
                        }
                    />
                </section>
            ) : (
                <section className="session-host__grid">
                    <div className="session-host__grid-left">
                        <VoteOptionsEditor
                            voteOptions={voteOptions ?? draftOptions}
                            onSave={handleSaveOptions}
                            disabled={!votingActive}
                            defaultKeywords={preset.suggestedTopics}
                        />
                    </div>
                    <div className="session-host__grid-right">
                        <VoteDashboard
                            aggregation={aggregation}
                            paletteOptions={voteOptions?.palettes ?? FIXED_PALETTES}
                            detailOptions={voteOptions?.details ?? FIXED_DETAILS}
                        />
                    </div>
                </section>
            )}

            {session.status !== 'complete' && (
                <section className="session-host__actions-bar">
                    <button
                        className="session-host__close-btn"
                        onClick={handleCloseAndGenerate}
                        disabled={!hasVotes || isGenerating || !votingActive}
                        title={!hasVotes ? L.noVotesYet : undefined}
                    >
                        {isGenerating ? L.closing : L.closeVote}
                    </button>
                </section>
            )}
        </div>
    );
}
