import { useCallback } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useTeacherReview } from '../../hooks/useTeacherReview';
import type { SessionSubmission } from '../../types/classroom';
import './TeacherReviewPanel.css';

interface TeacherReviewPanelProps {
    sessionId: string;
}

const L = {
    title: '학생 작품 검수',
    counter: (total: number, approved: number) =>
        `${total}명 제출 / ${approved}명 승인`,
    emptyTitle: '아직 제출된 작품이 없어요',
    emptyHint: '학생이 사진을 업로드하면 여기에 실시간으로 표시됩니다.',
    loading: '불러오는 중...',
    clickHint: '썸네일을 클릭하면 승인/반려가 토글됩니다.',
    approved: '승인됨',
    pending: '대기중',
    approve: '승인',
    unapprove: '승인 취소',
    errorGeneric: '변경에 실패했습니다.',
    anonymousNickname: '익명',
};

export default function TeacherReviewPanel({ sessionId }: TeacherReviewPanelProps) {
    const configured = isSupabaseConfigured();
    const {
        submissions,
        approvedCount,
        isLoading,
        error,
        approve,
        unapprove,
    } = useTeacherReview(configured ? sessionId : null);

    const handleToggle = useCallback(
        async (row: SessionSubmission) => {
            try {
                if (row.approved) {
                    await unapprove(row.id);
                } else {
                    await approve(row.id);
                }
            } catch {
                // swallow; the hook surfaces `error`
            }
        },
        [approve, unapprove]
    );

    if (!configured) return null;

    return (
        <section className="review-panel" aria-label={L.title}>
            <header className="review-panel__header">
                <h3 className="review-panel__title">{L.title}</h3>
                <span className="review-panel__counter">
                    {L.counter(submissions.length, approvedCount)}
                </span>
            </header>

            {error && (
                <p className="review-panel__error" role="alert">
                    {error}
                </p>
            )}

            {isLoading ? (
                <div className="review-panel__loading" role="status">
                    {L.loading}
                </div>
            ) : submissions.length === 0 ? (
                <div className="review-panel__empty">
                    <div className="review-panel__empty-emoji" aria-hidden="true">🖼️</div>
                    <h4 className="review-panel__empty-title">{L.emptyTitle}</h4>
                    <p className="review-panel__empty-hint">{L.emptyHint}</p>
                </div>
            ) : (
                <>
                    <p className="review-panel__hint">{L.clickHint}</p>
                    <ul className="review-panel__grid">
                        {submissions.map((row) => {
                            const isApproved = row.approved;
                            const name = row.nickname || L.anonymousNickname;
                            return (
                                <li key={row.id} className="review-panel__item">
                                    <button
                                        type="button"
                                        className={
                                            isApproved
                                                ? 'review-panel__thumb review-panel__thumb--approved'
                                                : 'review-panel__thumb'
                                        }
                                        onClick={() => handleToggle(row)}
                                        aria-pressed={isApproved}
                                        aria-label={`${name} - ${
                                            isApproved ? L.unapprove : L.approve
                                        }`}
                                        title={isApproved ? L.unapprove : L.approve}
                                    >
                                        <img
                                            className="review-panel__img"
                                            src={row.image_url}
                                            alt=""
                                            loading="lazy"
                                        />
                                        <span
                                            className={
                                                isApproved
                                                    ? 'review-panel__badge review-panel__badge--approved'
                                                    : 'review-panel__badge'
                                            }
                                        >
                                            {isApproved ? '✅' : '⏸'}
                                        </span>
                                    </button>
                                    <div className="review-panel__meta">
                                        <span className="review-panel__nick">{name}</span>
                                        <span
                                            className={
                                                isApproved
                                                    ? 'review-panel__status review-panel__status--approved'
                                                    : 'review-panel__status'
                                            }
                                        >
                                            {isApproved ? L.approved : L.pending}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
