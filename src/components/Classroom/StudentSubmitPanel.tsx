import { useCallback, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useStudentSubmission } from '../../hooks/useStudentSubmission';
import { resizeAndCompressImage } from '../../lib/imageUpload';
import './StudentSubmitPanel.css';

interface StudentSubmitPanelProps {
    sessionId: string;
    studentToken: string;
    nickname?: string | null;
}

const L = {
    title: '내 작품 제출',
    help: '색칠을 완료한 후 사진을 촬영해 제출하면 학급 전시장에 올라갑니다.',
    pick: '📸 사진 선택',
    uploading: '업로드 중...',
    submittedPending: '✅ 제출 완료! 선생님 검수 대기중',
    submittedApproved: '🌟 선생님이 승인했어요! 학급 전시장에 올라갑니다',
    retake: '🔄 다시 제출',
    approvedLocked: '승인된 작품이에요. 다시 제출하면 새 사진이 올라갑니다.',
    errorTooBig: '사진이 너무 커요. 조금 더 작은 이미지를 골라주세요.',
    errorGeneric: '업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    errorNotImage: '이미지 파일만 올려주세요.',
};

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024; // 20MB soft cap on the File (before resize)

export default function StudentSubmitPanel({
    sessionId,
    studentToken,
    nickname,
}: StudentSubmitPanelProps) {
    const configured = isSupabaseConfigured();
    const {
        submission,
        isUploading,
        error,
        submit,
    } = useStudentSubmission(configured ? sessionId : null, studentToken);

    const [localError, setLocalError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handlePick = useCallback(() => {
        setLocalError(null);
        fileInputRef.current?.click();
    }, []);

    const handleFile = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            // Reset the input so picking the same file twice fires onchange.
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                setLocalError(L.errorNotImage);
                return;
            }
            if (file.size > MAX_ORIGINAL_BYTES) {
                setLocalError(L.errorTooBig);
                return;
            }

            setLocalError(null);
            try {
                const blob = await resizeAndCompressImage(file, 1600, 0.8);
                await submit(blob, nickname ?? null);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setLocalError(msg || L.errorGeneric);
            }
        },
        [submit, nickname]
    );

    if (!configured) return null;

    return (
        <section className="submit-panel" aria-label={L.title}>
            <header className="submit-panel__header">
                <h3 className="submit-panel__title">{L.title}</h3>
                <p className="submit-panel__help">{L.help}</p>
            </header>

            {submission ? (
                <div className="submit-panel__submitted">
                    <img
                        className="submit-panel__preview"
                        src={submission.image_url}
                        alt="내가 제출한 작품"
                    />
                    <p
                        className={
                            submission.approved
                                ? 'submit-panel__status submit-panel__status--approved'
                                : 'submit-panel__status'
                        }
                        role="status"
                    >
                        {submission.approved ? L.submittedApproved : L.submittedPending}
                    </p>
                    {submission.approved && (
                        <p className="submit-panel__locked-hint">{L.approvedLocked}</p>
                    )}
                    <button
                        type="button"
                        className="submit-panel__retake"
                        onClick={handlePick}
                        disabled={isUploading}
                    >
                        {isUploading ? L.uploading : L.retake}
                    </button>
                </div>
            ) : (
                <div className="submit-panel__empty">
                    <button
                        type="button"
                        className="submit-panel__pick-btn"
                        onClick={handlePick}
                        disabled={isUploading}
                    >
                        {isUploading ? L.uploading : L.pick}
                    </button>
                </div>
            )}

            {(localError || error) && (
                <p className="submit-panel__error" role="alert">
                    {localError ?? error}
                </p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="submit-panel__file-input"
                onChange={handleFile}
                aria-hidden="true"
                tabIndex={-1}
            />
        </section>
    );
}
