import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="header__brand">
                <div className="header__logo">🎨</div>
                <div className="header__text">
                    <h1 className="header__title">Art Class</h1>
                    <span className="header__subtitle">AI 미술 도안 워크스페이스</span>
                </div>
            </div>
        </header>
    );
}
