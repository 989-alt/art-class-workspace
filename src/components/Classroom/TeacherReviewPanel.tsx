import { useCallback } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useTeacherReview } from '../../hooks/useTeacherReview';
import type { AssignmentSubmission } from '../../types/classroom';
import './TeacherReviewPanel.css';

interface TeacherReviewPanelProps {
    assignmentId: string;
    assignmentTitle: string;
    onBack: () => void;
}

const L = {
    backToClassroom: '← 학급으로 돌아가기',
    titleSuffix: ' 검수',
    counter: (total: number, approved: number) =>
        `${total}명 제출 / ${approved}명 승인`,
    notConfigured: 'Supabase 연결이 설정되지 않아 검수를 사용할 수 없어요.',
    emptyTitle: '아직 제출된 작품이 없어요',
    emptyHint: '학생이 사진을 업로드하면 여기에 실시간으로 표시됩니다.',
    loading: '불러오는 중...',
    clickHint: '썸네일을 클릭하면 승인/반려가 토글됩니다.',
    approved: '승인됨',
    pending: '대기중',
    approve: '승인',
    unapprove: '승인 취소',
    anonymousNickname: '익명',
};

export default function TeacherReviewPanel({
    assignmentId,
    assignmentTitle,
    onBack,
}: TeacherReviewPanelProps) {
    const configured = isSupabaseConfigured();
    const {
        submissions,
        approvedCount,
        isLoading,
        error,
        approve,
        unapprove,
    } = useTeacherReview(configured ? assignmentId : null);

    const handleToggle = useCallback(
        async (row: AssignmentSubmission) => {
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

    return (
        <section className="review-panel" aria-label={assignmentTitle + L.titleSuffix}>
            <header className="review-panel__topbar">
                <button
                    type="button"
                    className="review-panel__back"
                    onClick={onBack}
                >
                    {L.backToClassroom}
                </button>
                <h2 className="review-panel__title">
                    {assignmentTitle}
                    {L.titleSuffix}
                </h2>
                <span className="review-panel__counter">
                    {L.counter(submissions.length, approvedCount)}
                </span>
            </header>

            {!configured && (
                <p className="review-panel__error" role="alert">
                    {L.notConfigured}
                </p>
            )}

            {error && (
                <p className="review-panel__error" role="alert">
                    {error}
                </p>
            )}

            {configured && isLoading ? (
                <div className="review-panel__loading" role="status">
                    {L.loading}
                </div>
            ) : configured && submissions.length === 0 ? (
                <div className="review-panel__empty">
                    <div className="review-panel__empty-emoji" aria-hidden="true">🖼️</div>
                    <h4 className="review-panel__empty-title">{L.emptyTitle}</h4>
                    <p className="review-panel__empty-hint">{L.emptyHint}</p>
                </div>
            ) : configured ? (
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
            ) : null}
        </section>
    );
}
