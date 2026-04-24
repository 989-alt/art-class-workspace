import { useEffect, useRef, useState, type FormEvent } from 'react';
import './PublishAssignmentDialog.css';

interface PublishAssignmentDialogProps {
    classroomName: string;
    defaultTitle: string;
    isSubmitting: boolean;
    error: string | null;
    success?: boolean;
    onCancel: () => void;
    onSubmit: (title: string) => void;
    onGoToClassroom?: () => void;
}

const L = {
    title: '📤 우리 학급에 게시',
    descPrefix: '',
    descSuffix: '에 새 과제로 게시합니다.',
    inputLabel: '과제 제목',
    inputPlaceholder: '예: 우리 동네의 모습',
    cancel: '취소',
    submit: '게시',
    submitting: '게시 중...',
    successTitle: '게시되었습니다',
    successDesc: '학생들이 학급 페이지에서 새 과제를 볼 수 있습니다.',
    goToClassroom: '내 학급 보기',
    keepGenerating: '계속 생성',
    close: '닫기',
};

export default function PublishAssignmentDialog({
    classroomName,
    defaultTitle,
    isSubmitting,
    error,
    success = false,
    onCancel,
    onSubmit,
    onGoToClassroom,
}: PublishAssignmentDialogProps) {
    const [title, setTitle] = useState(defaultTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus the input on first mount; don't fight successive title prop
        // changes (the dialog stays open during submission).
        const id = window.setTimeout(() => inputRef.current?.focus(), 30);
        return () => window.clearTimeout(id);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isSubmitting, onCancel]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed || isSubmitting) return;
        onSubmit(trimmed);
    };

    const handleOverlay = () => {
        if (!isSubmitting) onCancel();
    };

    return (
        <div className="publish-dialog__overlay" onClick={handleOverlay}>
            <div
                className="publish-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="publish-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="publish-dialog-title" className="publish-dialog__title">
                    {L.title}
                </h2>

                {success ? (
                    <div className="publish-dialog__success">
                        <p className="publish-dialog__success-title">{L.successTitle}</p>
                        <p className="publish-dialog__success-desc">{L.successDesc}</p>
                        <div className="publish-dialog__actions">
                            <button
                                type="button"
                                className="publish-dialog__btn publish-dialog__btn--ghost"
                                onClick={onCancel}
                            >
                                {L.keepGenerating}
                            </button>
                            {onGoToClassroom && (
                                <button
                                    type="button"
                                    className="publish-dialog__btn publish-dialog__btn--primary"
                                    onClick={onGoToClassroom}
                                >
                                    {L.goToClassroom}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form className="publish-dialog__form" onSubmit={handleSubmit}>
                        <p className="publish-dialog__desc">
                            <strong>{classroomName}</strong>
                            {L.descSuffix}
                        </p>

                        <label className="publish-dialog__label">
                            {L.inputLabel}
                            <input
                                ref={inputRef}
                                className="publish-dialog__input"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={L.inputPlaceholder}
                                maxLength={60}
                                disabled={isSubmitting}
                            />
                        </label>

                        {error && (
                            <p className="publish-dialog__error" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="publish-dialog__actions">
                            <button
                                type="button"
                                className="publish-dialog__btn publish-dialog__btn--ghost"
                                onClick={onCancel}
                                disabled={isSubmitting}
                            >
                                {L.cancel}
                            </button>
                            <button
                                type="submit"
                                className="publish-dialog__btn publish-dialog__btn--primary"
                                disabled={isSubmitting || !title.trim()}
                            >
                                {isSubmitting ? L.submitting : L.submit}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
