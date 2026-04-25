import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useClassGallery, type ClassGalleryItem } from '../../hooks/useClassGallery';
import { exportClassCatalog } from '../../utils/classCatalogPdf';
import { getTeacherName, DEFAULT_TEACHER_NAME } from '../../utils/teacherProfile';
import './ClassGallery.css';

const L = {
    backToClassroom: '← 학급으로 돌아가기',
    title: '🎨 학급 전시장',
    counter: (n: number) => `${n}점 전시 중`,
    notConfigured: 'Supabase 연결이 설정되지 않아 전시장을 사용할 수 없어요.',
    empty: '아직 승인된 작품이 없어요',
    emptyHint: '교사가 작품을 승인하면 여기에 표시됩니다.',
    loading: '불러오는 중...',
    tvMode: '📺 TV 모드',
    catalogPdf: '📄 카탈로그 PDF',
    exporting: '만드는 중...',
    exportError: '카탈로그 PDF 생성에 실패했습니다.',
    anonymousNickname: '익명',
    closeTv: '나가기',
    prev: '이전',
    next: '다음',
    nothingToShow: '전시할 작품이 없어요',
    slideCounter: (i: number, total: number) => `${i + 1} / ${total}`,
};

const PLACEHOLDER_SRC =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
        `<rect width="120" height="120" fill="#f2ede6"/>` +
        `<text x="60" y="64" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#8b8582">no image</text>` +
        `</svg>`
    );

const SLIDE_INTERVAL_MS = 6000;

interface ClassGalleryProps {
    classroomId: string;
    classroomName: string;
    classroomCode: string;
    onBack: () => void;
}

export default function ClassGallery({
    classroomId,
    classroomName,
    classroomCode,
    onBack,
}: ClassGalleryProps) {
    const configured = isSupabaseConfigured();
    const { items, isLoading, error } = useClassGallery(configured ? classroomId : null);

    const [tvOpen, setTvOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const tvBtnRef = useRef<HTMLButtonElement | null>(null);
    const prevTvOpenRef = useRef(tvOpen);
    useEffect(() => {
        // Return focus to the TV launch button after the slideshow closes
        // (WCAG dialog pattern). Run after React unmounts the overlay so the
        // focus move isn't immediately stolen back.
        if (prevTvOpenRef.current && !tvOpen) {
            tvBtnRef.current?.focus();
        }
        prevTvOpenRef.current = tvOpen;
    }, [tvOpen]);

    const handleOpenTv = useCallback(() => {
        setTvOpen(true);
    }, []);
    const handleCloseTv = useCallback(() => {
        setTvOpen(false);
    }, []);

    const handleExport = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);
        setExportError(null);
        try {
            // Resolve teacher name: substitute null when the value still
            // matches the default (so the PDF cover doesn't render the
            // placeholder Korean string as the actual teacher).
            const rawName = getTeacherName();
            const teacherName =
                rawName && rawName !== DEFAULT_TEACHER_NAME ? rawName : null;
            await exportClassCatalog(
                items.map((it) => ({
                    imageUrl: it.submission.image_url,
                    nickname: it.submission.nickname,
                    assignmentTitle: it.assignmentTitle,
                })),
                {
                    classroomName,
                    classroomCode,
                    teacherName,
                    generatedAt: new Date(),
                },
                `class-catalog-${classroomCode}.pdf`
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setExportError(msg || L.exportError);
        } finally {
            setIsExporting(false);
        }
    }, [items, isExporting, classroomCode, classroomName]);

    return (
        <section className="class-gallery" aria-label={L.title}>
            <header className="class-gallery__header">
                <div className="class-gallery__header-left">
                    <button
                        type="button"
                        className="class-gallery__back"
                        onClick={onBack}
                    >
                        {L.backToClassroom}
                    </button>
                    <div>
                        <h2 className="class-gallery__title">{L.title}</h2>
                        <div className="class-gallery__meta">
                            <span className="class-gallery__meta-name">
                                {classroomName}
                            </span>
                            <span className="class-gallery__meta-code">
                                {classroomCode}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="class-gallery__toolbar">
                    <span className="class-gallery__counter">
                        {L.counter(items.length)}
                    </span>
                    <button
                        ref={tvBtnRef}
                        type="button"
                        className="class-gallery__tv-btn"
                        onClick={handleOpenTv}
                        disabled={items.length === 0}
                    >
                        {L.tvMode}
                    </button>
                    <button
                        type="button"
                        className="class-gallery__pdf-btn"
                        onClick={handleExport}
                        disabled={items.length === 0 || isExporting}
                    >
                        {isExporting ? L.exporting : L.catalogPdf}
                    </button>
                </div>
            </header>

            {!configured && (
                <p className="class-gallery__error" role="alert">
                    {L.notConfigured}
                </p>
            )}

            {(error || exportError) && (
                <p className="class-gallery__error" role="alert">
                    {error || exportError}
                </p>
            )}

            {configured && isLoading ? (
                <div className="class-gallery__loading" role="status">
                    {L.loading}
                </div>
            ) : configured && items.length === 0 ? (
                <div className="class-gallery__empty">
                    <div className="class-gallery__empty-emoji" aria-hidden="true">🖼️</div>
                    <h4 className="class-gallery__empty-title">{L.empty}</h4>
                    <p className="class-gallery__empty-hint">{L.emptyHint}</p>
                </div>
            ) : configured ? (
                <ul className="class-gallery__grid">
                    {items.map((it) => {
                        const name = it.submission.nickname || L.anonymousNickname;
                        return (
                            <li key={it.submission.id} className="class-gallery__item">
                                <div className="class-gallery__frame">
                                    <img
                                        className="class-gallery__img"
                                        src={it.submission.image_url}
                                        alt={name}
                                        loading="lazy"
                                        onError={(e) => {
                                            const el = e.currentTarget;
                                            if (el.dataset.fallbackApplied === '1') return;
                                            el.dataset.fallbackApplied = '1';
                                            el.src = PLACEHOLDER_SRC;
                                        }}
                                    />
                                </div>
                                <div className="class-gallery__nick">{name}</div>
                                {it.assignmentTitle && (
                                    <div className="class-gallery__assignment">
                                        {it.assignmentTitle}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            ) : null}

            {tvOpen && (
                <GallerySlideshow items={items} onClose={handleCloseTv} />
            )}
        </section>
    );
}

// ---- Slideshow (inline for cohesion) --------------------------------------

interface GallerySlideshowProps {
    items: ClassGalleryItem[];
    onClose: () => void;
}

function GallerySlideshow({ items, onClose }: GallerySlideshowProps) {
    const [index, setIndex] = useState(0);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const total = items.length;

    const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
    const current = total > 0 ? items[safeIndex] : null;

    const next = useCallback(() => {
        setIndex((i) => (total === 0 ? 0 : (i + 1) % total));
    }, [total]);
    const prev = useCallback(() => {
        setIndex((i) => (total === 0 ? 0 : (i - 1 + total) % total));
    }, [total]);

    // Request browser fullscreen (fall back silently to fixed overlay) and
    // bridge an external fullscreen exit (browser-level Esc) into closing the
    // dialog so the overlay doesn't linger in windowed mode.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const anyEl = el as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void>;
        };
        const req =
            anyEl.requestFullscreen?.bind(anyEl) ??
            anyEl.webkitRequestFullscreen?.bind(anyEl);
        if (req) {
            req().catch(() => {
                // Fullscreen denied (e.g. not triggered by a user gesture in
                // some browsers) — the CSS overlay still covers the viewport.
            });
        }
        // Focus the close button for keyboard accessibility.
        closeBtnRef.current?.focus();

        const onFsChange = () => {
            const anyDoc = document as Document & {
                webkitFullscreenElement?: Element | null;
            };
            if (!document.fullscreenElement && !anyDoc.webkitFullscreenElement) {
                onClose();
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener(
            'webkitfullscreenchange',
            onFsChange as EventListener
        );

        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener(
                'webkitfullscreenchange',
                onFsChange as EventListener
            );
            const anyDoc = document as Document & {
                webkitExitFullscreen?: () => Promise<void>;
            };
            if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
            } else if (anyDoc.webkitExitFullscreen) {
                anyDoc.webkitExitFullscreen().catch(() => {});
            }
        };
    }, [onClose]);

    // Auto-advance timer. Skip when there's 0 or 1 submission.
    useEffect(() => {
        if (total <= 1) return;
        const timer = window.setInterval(() => {
            setIndex((i) => (i + 1) % total);
        }, SLIDE_INTERVAL_MS);
        return () => window.clearInterval(timer);
    }, [total]);

    // Keyboard navigation.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (
                e.key === 'ArrowRight' ||
                e.key === ' ' ||
                e.key === 'Spacebar'
            ) {
                e.preventDefault();
                next();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prev();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [next, prev, onClose]);

    const name = current?.submission.nickname || L.anonymousNickname;
    const assignmentTitle = current?.assignmentTitle || '';

    return (
        <div
            ref={containerRef}
            className="gallery-slideshow"
            role="dialog"
            aria-modal="true"
            aria-label={L.tvMode}
        >
            <button
                ref={closeBtnRef}
                type="button"
                className="gallery-slideshow__close"
                onClick={onClose}
                aria-label={L.closeTv}
            >
                ✕
            </button>

            {total === 0 ? (
                <div className="gallery-slideshow__empty">{L.nothingToShow}</div>
            ) : (
                <>
                    <div className="gallery-slideshow__stage">
                        {current && (
                            <img
                                key={current.submission.id}
                                className="gallery-slideshow__img"
                                src={current.submission.image_url}
                                alt={name}
                                onError={(e) => {
                                    const el = e.currentTarget;
                                    if (el.dataset.fallbackApplied === '1') return;
                                    el.dataset.fallbackApplied = '1';
                                    el.src = PLACEHOLDER_SRC;
                                }}
                            />
                        )}
                    </div>
                    <div className="gallery-slideshow__caption">
                        <div className="gallery-slideshow__nick">{name}</div>
                        {assignmentTitle && (
                            <div className="gallery-slideshow__assignment">
                                {assignmentTitle}
                            </div>
                        )}
                        <div className="gallery-slideshow__counter">
                            {L.slideCounter(safeIndex, total)}
                        </div>
                    </div>
                    {total > 1 && (
                        <>
                            <button
                                type="button"
                                className="gallery-slideshow__nav gallery-slideshow__nav--prev"
                                onClick={prev}
                                aria-label={L.prev}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                className="gallery-slideshow__nav gallery-slideshow__nav--next"
                                onClick={next}
                                aria-label={L.next}
                            >
                                ›
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
