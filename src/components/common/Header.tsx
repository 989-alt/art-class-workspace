import { maskKey } from '../../utils/apiKeyManager';
import './Header.css';

interface HeaderProps {
    apiKey: string | null;
    onSettingsClick: () => void;
    onOpenClassroom?: () => void;
}

const L = {
    title: 'Art Class',
    subtitle: 'AI 미술 도안 워크스페이스',
    keyUnset: '키 미설정',
    classroomLabel: '내 학급',
    classroomTitle: '내 학급',
    settingsLabel: 'API 키 설정',
};

export default function Header({ apiKey, onSettingsClick, onOpenClassroom }: HeaderProps) {
    return (
        <header className="header">
            <div className="header__brand">
                <div className="header__logo" aria-hidden="true">🎨</div>
                <div className="header__text">
                    <h1 className="header__title">{L.title}</h1>
                    <span className="header__subtitle">{L.subtitle}</span>
                </div>
            </div>
            <div className="header__actions">
                <div className="header__key-status">
                    {apiKey ? (
                        <span className="header__key-badge header__key-badge--active">
                            <span aria-hidden="true">🔑</span> {maskKey(apiKey)}
                        </span>
                    ) : (
                        <span className="header__key-badge header__key-badge--inactive">
                            {L.keyUnset}
                        </span>
                    )}
                </div>
                {onOpenClassroom && (
                    <button
                        className="header__classroom-btn"
                        onClick={onOpenClassroom}
                        title={L.classroomTitle}
                        aria-label={L.classroomTitle}
                    >
                        <span aria-hidden="true">🏫</span>
                        <span className="header__classroom-text">{L.classroomLabel}</span>
                    </button>
                )}
                <button
                    className="header__settings-btn"
                    onClick={onSettingsClick}
                    title={L.settingsLabel}
                    aria-label={L.settingsLabel}
                >
                    <span aria-hidden="true">⚙️</span>
                </button>
            </div>
        </header>
    );
}
