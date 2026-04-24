import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useStudentClassroom } from '../../hooks/useStudentClassroom';
import { isValidClassroomCode } from '../../utils/classroomCode';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import StudentSubmitPanel from './StudentSubmitPanel';
import type { Assignment } from '../../types/classroom';
import './StudentClassView.css';

interface StudentClassViewProps {
    code: string;
}

const L = {
    appTitle: '미술 수업',
    invalidCode: '잘못된 학급 코드입니다',
    invalidCodeHint: '선생님께 받은 6자리 코드가 맞는지 확인해 주세요.',
    notConfigured: '학급 모드가 구성되지 않았습니다',
    notConfiguredHint: '선생님께 알려 주세요. (관리자: SUPABASE_SETUP.md 참조)',
    loading: '학급을 불러오는 중...',
    notFound: '학급을 찾을 수 없어요',
    notFoundHint: '코드가 정확한지 다시 한 번 확인해 주세요.',
    errorPrefix: '문제가 생겼어요: ',
    retry: '다시 시도',
    nicknamePromptTitle: '안녕! 이름을 알려줘',
    nicknamePromptDesc: '학급에 어떻게 표시할지 정해 줘. 본명이 아니어도 괜찮아.',
    nicknameLabel: '닉네임',
    nicknamePlaceholder: '예: 김민지, 그림짱',
    nicknameSubmit: '입장하기',
    nicknameTooLong: '닉네임은 20자까지만 가능합니다.',
    welcomePrefix: '환영합니다, ',
    welcomeSuffix: ' 학생!',
    classCodeLabel: '학급 코드',
    changeNickname: '닉네임 변경',
    assignmentsTitle: '오늘의 도안',
    assignmentsEmpty: '아직 선생님이 올린 도안이 없어요. 잠시 후 다시 와 주세요.',
    assignmentThumbAlt: '도안 미리보기',
    assignmentOpen: '도안 보기',
    backToList: '← 목록으로',
    assignmentDetailTitle: '도안 상세',
    downloadPng: '📥 PNG 다운로드',
    downloading: '다운로드 중...',
    downloadFailed: '다운로드에 실패했어요. 잠시 후 다시 시도해 주세요.',
    nickname: '닉네임',
};

const NICKNAME_MAX = 20;

function nicknameStorageKey(code: string): string {
    return `art-class.student.${code}.nickname`;
}

function tokenStorageKey(code: string): string {
    return `art-class.student.${code}.token`;
}

function safeLocalGet(key: string): string | null {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeLocalSet(key: string, value: string): void {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        window.localStorage.setItem(key, value);
    } catch {
        // best-effort
    }
}

function generateToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function ensureStudentToken(code: string): string {
    const key = tokenStorageKey(code);
    const existing = safeLocalGet(key);
    if (existing && existing.length > 0) return existing;
    const created = generateToken();
    safeLocalSet(key, created);
    return created;
}

function safeFileName(title: string, fallbackId: string): string {
    const trimmed = title.trim().replace(/[^a-zA-Z0-9가-힣 _-]/g, '').slice(0, 40);
    const base = trimmed.length > 0 ? trimmed : fallbackId.slice(0, 8);
    return `${base}.png`;
}

interface AssignmentDetailProps {
    assignment: Assignment;
    studentToken: string;
    nickname: string;
    onBack: () => void;
}

function AssignmentDetail({ assignment, studentToken, nickname, onBack }: AssignmentDetailProps) {
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownload = useCallback(async () => {
        if (downloading) return;
        setDownloading(true);
        setDownloadError(null);
        const fileName = safeFileName(assignment.title, assignment.id);
        try {
            // Try fetch → blob path first (forces a download even if the
            // browser would otherwise navigate). Falls back to direct anchor
            // if the storage CORS rejects the fetch.
            const res = await fetch(assignment.image_url, { mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            try {
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        } catch {
            try {
                const a = document.createElement('a');
                a.href = assignment.image_url;
                a.download = fileName;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch {
                setDownloadError(L.downloadFailed);
            }
        } finally {
            setDownloading(false);
        }
    }, [assignment.id, assignment.image_url, assignment.title, downloading]);

    return (
        <div className="student-class__detail">
            <button type="button" className="student-class__back-btn" onClick={onBack}>
                {L.backToList}
            </button>

            <div className="student-class__detail-card">
                <h2 className="student-class__detail-title">{assignment.title}</h2>
                <div className="student-class__preview-wrap">
                    <img
                        className="student-class__preview"
                        src={assignment.image_url}
                        alt={L.assignmentThumbAlt}
                    />
                </div>

                <div className="student-class__detail-actions">
                    <button
                        type="button"
                        className="student-class__download-btn"
                        onClick={handleDownload}
                        disabled={downloading}
                    >
                        {downloading ? L.downloading : L.downloadPng}
                    </button>
                </div>
                {downloadError && (
                    <p className="student-class__error" role="alert">
                        {downloadError}
                    </p>
                )}
            </div>

            <StudentSubmitPanel
                assignmentId={assignment.id}
                studentToken={studentToken}
                nickname={nickname}
            />
        </div>
    );
}

export default function StudentClassView({ code }: StudentClassViewProps) {
    const supabaseConfigured = isSupabaseConfigured();
    const validCode = useMemo(() => isValidClassroomCode(code), [code]);
    const normalisedCode = validCode ? code : null;

    const { classroom, assignments, isLoading, error, reload } = useStudentClassroom(normalisedCode);

    // Restore (or mint) the student token tied to this class code. Token is
    // anonymous — server only ever sees the UUID + nickname.
    const studentToken = useMemo(
        () => (validCode ? ensureStudentToken(code) : ''),
        [code, validCode]
    );

    // Restore nickname from localStorage on mount; falls back to empty.
    const [nickname, setNickname] = useState<string>(() => {
        if (!validCode) return '';
        return safeLocalGet(nicknameStorageKey(code)) ?? '';
    });
    const [nicknameDraft, setNicknameDraft] = useState<string>('');
    const [nicknameError, setNicknameError] = useState<string | null>(null);
    const [editingNickname, setEditingNickname] = useState<boolean>(false);

    useEffect(() => {
        // Resync draft when classroom code changes (e.g. user navigates from
        // /class/AAAAAA to /class/BBBBBB without remount). Initial mount value
        // is already populated by the useState lazy initializer above.
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            if (!validCode) {
                setNickname('');
                setNicknameDraft('');
                return;
            }
            const stored = safeLocalGet(nicknameStorageKey(code)) ?? '';
            setNickname(stored);
            setNicknameDraft(stored);
        });
        return () => {
            cancelled = true;
        };
    }, [code, validCode]);

    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);

    const handleNicknameSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            const value = nicknameDraft.trim();
            if (!value) {
                setNicknameError(L.nicknameLabel);
                return;
            }
            if (value.length > NICKNAME_MAX) {
                setNicknameError(L.nicknameTooLong);
                return;
            }
            safeLocalSet(nicknameStorageKey(code), value);
            setNickname(value);
            setNicknameError(null);
            setEditingNickname(false);
        },
        [code, nicknameDraft]
    );

    const handleStartChangeNickname = useCallback(() => {
        setNicknameDraft(nickname);
        setNicknameError(null);
        setEditingNickname(true);
    }, [nickname]);

    // Invalid code branch.
    if (!validCode) {
        return (
            <div className="student-class">
                <div className="student-class__hero">
                    <h1 className="student-class__brand">{L.appTitle}</h1>
                </div>
                <div className="student-class__center-card">
                    <h2 className="student-class__error-title">{L.invalidCode}</h2>
                    <p className="student-class__hint">{L.invalidCodeHint}</p>
                </div>
            </div>
        );
    }

    // Supabase missing — error string is set by the hook.
    if (!supabaseConfigured) {
        return (
            <div className="student-class">
                <div className="student-class__hero">
                    <h1 className="student-class__brand">{L.appTitle}</h1>
                </div>
                <div className="student-class__center-card">
                    <h2 className="student-class__error-title">{L.notConfigured}</h2>
                    <p className="student-class__hint">{L.notConfiguredHint}</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="student-class">
                <div className="student-class__hero">
                    <h1 className="student-class__brand">{L.appTitle}</h1>
                </div>
                <div className="student-class__center-card">
                    <div className="student-class__spinner" aria-hidden="true" />
                    <p className="student-class__hint">{L.loading}</p>
                </div>
            </div>
        );
    }

    if (error || !classroom) {
        const isNotFound = !classroom;
        return (
            <div className="student-class">
                <div className="student-class__hero">
                    <h1 className="student-class__brand">{L.appTitle}</h1>
                </div>
                <div className="student-class__center-card">
                    <h2 className="student-class__error-title">
                        {isNotFound ? L.notFound : L.errorPrefix + (error ?? '')}
                    </h2>
                    <p className="student-class__hint">{L.notFoundHint}</p>
                    <button
                        type="button"
                        className="student-class__retry-btn"
                        onClick={reload}
                    >
                        {L.retry}
                    </button>
                </div>
            </div>
        );
    }

    // Need nickname.
    if (!nickname || editingNickname) {
        return (
            <div className="student-class">
                <div className="student-class__hero">
                    <h1 className="student-class__brand">{L.appTitle}</h1>
                    <p className="student-class__class-name">{classroom.name}</p>
                </div>
                <div className="student-class__center-card">
                    <h2 className="student-class__nickname-title">{L.nicknamePromptTitle}</h2>
                    <p className="student-class__hint">{L.nicknamePromptDesc}</p>
                    <form
                        className="student-class__nickname-form"
                        onSubmit={handleNicknameSubmit}
                    >
                        <label className="student-class__nickname-label">
                            {L.nicknameLabel}
                            <input
                                className="student-class__nickname-input"
                                type="text"
                                value={nicknameDraft}
                                onChange={(e) => setNicknameDraft(e.target.value)}
                                placeholder={L.nicknamePlaceholder}
                                maxLength={NICKNAME_MAX}
                                autoFocus
                            />
                        </label>
                        {nicknameError && (
                            <p className="student-class__error">{nicknameError}</p>
                        )}
                        <button
                            type="submit"
                            className="student-class__nickname-submit"
                            disabled={!nicknameDraft.trim()}
                        >
                            {L.nicknameSubmit}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (activeAssignment) {
        return (
            <div className="student-class">
                <header className="student-class__header">
                    <div className="student-class__header-meta">
                        <span className="student-class__class-tag">{classroom.name}</span>
                        <span className="student-class__nickname-tag">
                            {L.nickname}: {nickname}
                        </span>
                    </div>
                </header>
                <main className="student-class__main">
                    <AssignmentDetail
                        assignment={activeAssignment}
                        studentToken={studentToken}
                        nickname={nickname}
                        onBack={() => setActiveAssignment(null)}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="student-class">
            <header className="student-class__header">
                <div className="student-class__header-meta">
                    <span className="student-class__class-tag">{classroom.name}</span>
                    <span className="student-class__class-code">
                        {L.classCodeLabel}: {classroom.code}
                    </span>
                </div>
                <div className="student-class__welcome">
                    <span>
                        {L.welcomePrefix}
                        <strong>{nickname}</strong>
                        {L.welcomeSuffix}
                    </span>
                    <button
                        type="button"
                        className="student-class__nickname-edit"
                        onClick={handleStartChangeNickname}
                    >
                        {L.changeNickname}
                    </button>
                </div>
            </header>

            <main className="student-class__main">
                <h2 className="student-class__section-title">{L.assignmentsTitle}</h2>
                {assignments.length === 0 ? (
                    <p className="student-class__empty">{L.assignmentsEmpty}</p>
                ) : (
                    <ul className="student-class__list">
                        {assignments.map((a) => (
                            <li key={a.id} className="student-class__item">
                                <button
                                    type="button"
                                    className="student-class__item-btn"
                                    onClick={() => setActiveAssignment(a)}
                                >
                                    <div className="student-class__item-thumb-wrap">
                                        <img
                                            className="student-class__item-thumb"
                                            src={a.image_url}
                                            alt={L.assignmentThumbAlt}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="student-class__item-meta">
                                        <span className="student-class__item-title">
                                            {a.title}
                                        </span>
                                        <span className="student-class__item-cta">
                                            {L.assignmentOpen} →
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
