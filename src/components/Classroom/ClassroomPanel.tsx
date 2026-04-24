import { useEffect, useMemo, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { useClassroom } from '../../hooks/useClassroom';
import { useAssignments } from '../../hooks/useAssignments';
import type { Assignment } from '../../types/classroom';
import './ClassroomPanel.css';

interface ClassroomPanelProps {
    onBack: () => void;
}

const L = {
    backToGenerator: '← 생성기로 돌아가기',
    title: '우리 학급',
    loading: '불러오는 중...',
    errorPrefix: '오류: ',
    // create mode
    createTitle: '학급 만들기',
    createDescription:
        '학급을 하나 만들면 학생들이 QR·코드로 입장해서 활동할 수 있어요.',
    createInputLabel: '학급 이름',
    createInputPlaceholder: '예: 3학년 2반 미술 2026',
    createSubmit: '학급 만들기',
    creating: '만드는 중...',
    // manage mode
    classNameLabel: '학급 이름',
    renameAction: '이름 수정',
    renameSave: '저장',
    renameCancel: '취소',
    qrSectionTitle: '학생 입장 QR',
    qrAlt: '학급 입장 QR 코드',
    codeLabel: '학급 코드',
    copyCode: '코드 복사',
    copyUrl: 'URL 복사',
    copied: '복사되었습니다',
    studentUrlLabel: '학생 접속 주소',
    assignmentsTitle: '과제',
    assignmentsLoading: '과제를 불러오는 중...',
    assignmentsError: '과제를 불러오지 못했습니다.',
    assignmentsEmpty:
        '아직 과제가 없습니다. 도안을 만들고 결과 화면에서 ‘우리 학급에 게시’를 눌러 보세요.',
    assignmentDelete: '삭제',
    assignmentDeleteConfirm: '이 과제를 삭제하시겠어요? 학생 제출은 함께 사라질 수 있습니다.',
    assignmentThumbAlt: '과제 썸네일',
    galleryTitle: '전시장',
    galleryEmpty: '아직 승인된 작품이 없습니다.',
};

function buildStudentUrl(code: string): string {
    if (typeof window === 'undefined') {
        return `/class/${code}`;
    }
    const { origin, pathname } = window.location;
    // Preserve sub-path deployments (e.g. GitHub Pages) by anchoring to the
    // current document directory.
    const base = pathname.endsWith('/') ? pathname : pathname.replace(/[^/]*$/, '');
    return `${origin}${base}#/class/${code}`;
}

function formatCreatedAt(iso: string): string {
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    } catch {
        return iso;
    }
}

interface AssignmentRowProps {
    assignment: Assignment;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}

function AssignmentRow({ assignment, onDelete, isDeleting }: AssignmentRowProps) {
    const handleDelete = () => {
        if (isDeleting) return;
        if (window.confirm(L.assignmentDeleteConfirm)) {
            onDelete(assignment.id);
        }
    };
    return (
        <li className="classroom-panel__assignment">
            <div className="classroom-panel__assignment-thumb-wrap">
                <img
                    className="classroom-panel__assignment-thumb"
                    src={assignment.image_url}
                    alt={L.assignmentThumbAlt}
                    loading="lazy"
                />
            </div>
            <div className="classroom-panel__assignment-meta">
                <span className="classroom-panel__assignment-title">{assignment.title}</span>
                <span className="classroom-panel__assignment-date">
                    {formatCreatedAt(assignment.created_at)}
                </span>
            </div>
            <button
                type="button"
                className="classroom-panel__assignment-delete"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label={L.assignmentDelete}
                title={L.assignmentDelete}
            >
                <span aria-hidden="true">🗑️</span>
            </button>
        </li>
    );
}

export default function ClassroomPanel({ onBack }: ClassroomPanelProps) {
    const { classroom, isLoading, error, create, rename } = useClassroom();
    const {
        assignments,
        isLoading: assignmentsLoading,
        error: assignmentsError,
        remove: removeAssignment,
    } = useAssignments(classroom?.id ?? null);

    const [createName, setCreateName] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState<string | null>(null);

    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [copyNotice, setCopyNotice] = useState<string | null>(null);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const studentUrl = useMemo(
        () => (classroom ? buildStudentUrl(classroom.code) : ''),
        [classroom]
    );

    useEffect(() => {
        if (!studentUrl) {
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
    }, [studentUrl]);

    useEffect(() => {
        if (!copyNotice) return;
        const t = window.setTimeout(() => setCopyNotice(null), 1600);
        return () => window.clearTimeout(t);
    }, [copyNotice]);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        if (!createName.trim() || creating) return;
        setCreating(true);
        setCreateError(null);
        try {
            await create(createName);
            setCreateName('');
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : String(err));
        } finally {
            setCreating(false);
        }
    };

    const startEditing = () => {
        if (!classroom) return;
        setEditName(classroom.name);
        setRenameError(null);
        setEditing(true);
    };

    const handleRename = async (e: FormEvent) => {
        e.preventDefault();
        if (renaming) return;
        setRenaming(true);
        setRenameError(null);
        try {
            await rename(editName);
            setEditing(false);
        } catch (err) {
            setRenameError(err instanceof Error ? err.message : String(err));
        } finally {
            setRenaming(false);
        }
    };

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopyNotice(L.copied);
        } catch {
            // Older browsers / insecure contexts: fall back to a temp textarea.
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                setCopyNotice(L.copied);
            } finally {
                document.body.removeChild(ta);
            }
        }
    };

    const handleAssignmentDelete = async (id: string) => {
        setDeletingId(id);
        setDeleteError(null);
        try {
            await removeAssignment(id);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : String(err));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="classroom-panel">
            <div className="classroom-panel__topbar">
                <button className="classroom-panel__back" onClick={onBack}>
                    {L.backToGenerator}
                </button>
                <h1 className="classroom-panel__title">{L.title}</h1>
            </div>

            {isLoading && (
                <div className="classroom-panel__status">{L.loading}</div>
            )}

            {!isLoading && error && (
                <div className="classroom-panel__status classroom-panel__status--error">
                    {L.errorPrefix}{error}
                </div>
            )}

            {!isLoading && !classroom && !error && (
                <section className="classroom-panel__create">
                    <h2 className="classroom-panel__section-title">{L.createTitle}</h2>
                    <p className="classroom-panel__description">{L.createDescription}</p>
                    <form className="classroom-panel__create-form" onSubmit={handleCreate}>
                        <label className="classroom-panel__label">
                            {L.createInputLabel}
                            <input
                                className="classroom-panel__input"
                                type="text"
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                placeholder={L.createInputPlaceholder}
                                maxLength={50}
                                disabled={creating}
                                autoFocus
                            />
                        </label>
                        {createError && (
                            <p className="classroom-panel__error">{createError}</p>
                        )}
                        <button
                            type="submit"
                            className="classroom-panel__submit"
                            disabled={creating || !createName.trim()}
                        >
                            {creating ? L.creating : L.createSubmit}
                        </button>
                    </form>
                </section>
            )}

            {!isLoading && classroom && (
                <div className="classroom-panel__manage">
                    <section className="classroom-panel__name-card">
                        <span className="classroom-panel__name-label">{L.classNameLabel}</span>
                        {!editing ? (
                            <div className="classroom-panel__name-row">
                                <span className="classroom-panel__name-text">{classroom.name}</span>
                                <button
                                    className="classroom-panel__name-edit"
                                    onClick={startEditing}
                                    aria-label={L.renameAction}
                                    title={L.renameAction}
                                >
                                    <span aria-hidden="true">✏️</span>
                                </button>
                            </div>
                        ) : (
                            <form className="classroom-panel__rename-form" onSubmit={handleRename}>
                                <input
                                    className="classroom-panel__input"
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    maxLength={50}
                                    disabled={renaming}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="classroom-panel__rename-save"
                                    disabled={renaming || !editName.trim()}
                                >
                                    {L.renameSave}
                                </button>
                                <button
                                    type="button"
                                    className="classroom-panel__rename-cancel"
                                    onClick={() => setEditing(false)}
                                    disabled={renaming}
                                >
                                    {L.renameCancel}
                                </button>
                                {renameError && (
                                    <p className="classroom-panel__error">{renameError}</p>
                                )}
                            </form>
                        )}
                    </section>

                    <section className="classroom-panel__qr-card">
                        <h2 className="classroom-panel__section-title">{L.qrSectionTitle}</h2>
                        <div className="classroom-panel__qr-wrap">
                            {qrDataUrl ? (
                                <img
                                    className="classroom-panel__qr-img"
                                    src={qrDataUrl}
                                    alt={L.qrAlt}
                                    width={240}
                                    height={240}
                                />
                            ) : (
                                <div className="classroom-panel__qr-placeholder" aria-hidden="true" />
                            )}
                        </div>

                        <div className="classroom-panel__code-row">
                            <span className="classroom-panel__code-label">{L.codeLabel}</span>
                            <code className="classroom-panel__code">{classroom.code}</code>
                            <button
                                className="classroom-panel__copy-btn"
                                onClick={() => copy(classroom.code)}
                            >
                                {L.copyCode}
                            </button>
                        </div>

                        <div className="classroom-panel__url-row">
                            <span className="classroom-panel__url-label">{L.studentUrlLabel}</span>
                            <span className="classroom-panel__url" title={studentUrl}>
                                {studentUrl}
                            </span>
                            <button
                                className="classroom-panel__copy-btn"
                                onClick={() => copy(studentUrl)}
                            >
                                {L.copyUrl}
                            </button>
                        </div>

                        {copyNotice && (
                            <p className="classroom-panel__copy-notice">{copyNotice}</p>
                        )}
                    </section>

                    <section className="classroom-panel__assignments">
                        <h2 className="classroom-panel__section-title">{L.assignmentsTitle}</h2>

                        {assignmentsLoading && (
                            <p className="classroom-panel__placeholder">
                                {L.assignmentsLoading}
                            </p>
                        )}

                        {!assignmentsLoading && assignmentsError && (
                            <p className="classroom-panel__error">
                                {L.assignmentsError} {assignmentsError}
                            </p>
                        )}

                        {!assignmentsLoading && !assignmentsError && assignments.length === 0 && (
                            <p className="classroom-panel__placeholder">
                                {L.assignmentsEmpty}
                            </p>
                        )}

                        {!assignmentsLoading && assignments.length > 0 && (
                            <ul className="classroom-panel__assignment-list">
                                {assignments.map((a) => (
                                    <AssignmentRow
                                        key={a.id}
                                        assignment={a}
                                        onDelete={handleAssignmentDelete}
                                        isDeleting={deletingId === a.id}
                                    />
                                ))}
                            </ul>
                        )}

                        {deleteError && (
                            <p className="classroom-panel__error">{deleteError}</p>
                        )}
                    </section>

                    <section className="classroom-panel__gallery">
                        <h2 className="classroom-panel__section-title">{L.galleryTitle}</h2>
                        {/* Placeholder for v3-T5. */}
                        <p className="classroom-panel__placeholder">{L.galleryEmpty}</p>
                    </section>
                </div>
            )}
        </div>
    );
}
