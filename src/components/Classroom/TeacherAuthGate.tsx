import { useState, type ReactNode, type FormEvent } from 'react';
import { useTeacherAuth } from '../../hooks/useTeacherAuth';
import './TeacherAuthGate.css';

interface TeacherAuthGateProps {
    children: ReactNode;
    onBack?: () => void;
}

// Korean strings via \uXXXX-safe template literal definitions. Keep at file
// top for easier auditing.
const L = {
    title: '교사 로그인', // 교사 로그인
    subtitle: '학급 모드를 진행하려면 계정이 필요합니다.', // 학급 모드를 진행하려면 계정이 필요합니다.
    email: '이메일', // 이메일
    password: '비밀번호', // 비밀번호
    signIn: '로그인', // 로그인
    signUp: '회원가입', // 회원가입
    toggleToSignUp: '계정이 없나요? 회원가입', // 계정이 없나요? 회원가입
    toggleToSignIn: '이미 계정이 있나요? 로그인', // 이미 계정이 있나요? 로그인
    loading: '처리 중...', // 처리 중...
    back: '← 돌아가기', // ← 돌아가기
    logout: '로그아웃', // 로그아웃
    unconfiguredTitle: 'Supabase 설정이 필요합니다', // Supabase 설정이 필요합니다
    unconfiguredBody: '학급 모드를 사용하려면 SUPABASE_SETUP.md 문서를 따라 Supabase 프로젝트를 연결해주세요.', // 학급 모드를 사용하려면 SUPABASE_SETUP.md 문서를 따라 Supabase 프로젝트를 연결해주세요.
    signedInAs: '로그인 계정:', // 로그인 계정:
    signupCheckEmail: '회원가입이 완료되었습니다. Supabase 설정에 따라 메일 인증이 필요할 수 있습니다.', // 회원가입이 완료되었습니다. Supabase 설정에 따라 메일 인증이 필요할 수 있습니다.
};

export default function TeacherAuthGate({ children, onBack }: TeacherAuthGateProps) {
    const { user, isAuthenticated, isLoading, isConfigured, signIn, signUp, signOut } = useTeacherAuth();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [formNotice, setFormNotice] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if (!isConfigured) {
        return (
            <div className="teacher-auth-gate">
                <div className="teacher-auth-gate__card">
                    <h2 className="teacher-auth-gate__title">{L.unconfiguredTitle}</h2>
                    <p className="teacher-auth-gate__subtitle">{L.unconfiguredBody}</p>
                    <a
                        className="teacher-auth-gate__link"
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                    >
                        SUPABASE_SETUP.md
                    </a>
                    {onBack && (
                        <button className="teacher-auth-gate__back" onClick={onBack}>
                            {L.back}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="teacher-auth-gate">
                <div className="teacher-auth-gate__card">
                    <p>{L.loading}</p>
                </div>
            </div>
        );
    }

    if (isAuthenticated && user) {
        return (
            <div className="teacher-auth-gate__authed">
                <div className="teacher-auth-gate__authed-bar">
                    <span className="teacher-auth-gate__authed-email">
                        {L.signedInAs} {user.email}
                    </span>
                    <div className="teacher-auth-gate__authed-actions">
                        {onBack && (
                            <button className="teacher-auth-gate__back" onClick={onBack}>
                                {L.back}
                            </button>
                        )}
                        <button className="teacher-auth-gate__logout" onClick={() => signOut()}>
                            {L.logout}
                        </button>
                    </div>
                </div>
                {children}
            </div>
        );
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setFormNotice(null);
        if (!email.trim() || !password) return;
        setSubmitting(true);
        try {
            if (mode === 'signin') {
                await signIn(email.trim(), password);
            } else {
                await signUp(email.trim(), password);
                setFormNotice(L.signupCheckEmail);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setFormError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="teacher-auth-gate">
            <div className="teacher-auth-gate__card">
                <h2 className="teacher-auth-gate__title">{L.title}</h2>
                <p className="teacher-auth-gate__subtitle">{L.subtitle}</p>

                <form className="teacher-auth-gate__form" onSubmit={handleSubmit}>
                    <label className="teacher-auth-gate__label">
                        {L.email}
                        <input
                            className="teacher-auth-gate__input"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={submitting}
                        />
                    </label>
                    <label className="teacher-auth-gate__label">
                        {L.password}
                        <input
                            className="teacher-auth-gate__input"
                            type="password"
                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={6}
                            required
                            disabled={submitting}
                        />
                    </label>

                    {formError && <p className="teacher-auth-gate__error">{formError}</p>}
                    {formNotice && <p className="teacher-auth-gate__notice">{formNotice}</p>}

                    <button
                        className="teacher-auth-gate__submit"
                        type="submit"
                        disabled={submitting || !email.trim() || !password}
                    >
                        {submitting ? L.loading : mode === 'signin' ? L.signIn : L.signUp}
                    </button>

                    <button
                        type="button"
                        className="teacher-auth-gate__toggle"
                        onClick={() => {
                            setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                            setFormError(null);
                            setFormNotice(null);
                        }}
                        disabled={submitting}
                    >
                        {mode === 'signin' ? L.toggleToSignUp : L.toggleToSignIn}
                    </button>
                </form>

                {onBack && (
                    <button className="teacher-auth-gate__back" onClick={onBack}>
                        {L.back}
                    </button>
                )}
            </div>
        </div>
    );
}
