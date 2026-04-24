import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { useClassGallery } from '../../hooks/useClassGallery';
import { exportClassCatalog } from '../../utils/classCatalogPdf';
import type { SessionSubmission } from '../../types/classroom';
import './ClassGallery.css';

const L = {
    title: '학급 전시장',
    counter: (n: number) => `${n}점 전시 중`,
    empty: '승인된 작품이 아직 없어요',
    emptyHint: '교사가 작품을 승인하면 여기에 표시됩니다.',
    loading: '불러오는 중...',
    tvMode: '📺 TV 모드',
    catalogPdf: '📄 카탈로그 PDF',
    exporting: '만드는 중...',
    exportError: '카탈로그 PDF 생성에 실패했습니다.',
    anonymousNickname: '익명',
    placeholder: '이미지 없음',
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
    sessionId: string;
    sessionCode: string;
    unitTitle: string;
    unitCode: string;
    teacherName?: string | null;
}

export default function ClassGallery({
    sessionId,
    sessionCode,
    unitTitle,
    unitCode,
    teacherName,
}: ClassGalleryProps) {
    const configured = isSupabaseConfigured();
    const { approved, isLoading, error } = useClassGallery(configured ? sessionId : null);

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
            await exportClassCatalog(
                approved.map((r) => ({ imageUrl: r.image_url, nickname: r.nickname })),
                {
                    unitTitle,
                    unitCode,
                    sessionCode,
                    teacherName: teacherName ?? null,
                    generatedAt: new Date(),
                },
                `class-catalog-${sessionCode}.pdf`
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setExportError(msg || L.exportError);
        } finally {
            setIsExporting(false);
        }
    }, [approved, isExporting, sessionCode, teacherName, unitCode, unitTitle]);

    if (!configured) return null;

    return (
        <section className="class-gallery" aria-label={L.title}>
            <header className="class-gallery__header">
                <div>
                    <h3 className="class-gallery__title">{L.title}</h3>
                    <div className="class-gallery__meta">
                        <span className="class-gallery__meta-code">{unitCode}</span>
                        <span className="class-gallery__meta-title">{unitTitle}</span>
                    </div>
                </div>
                <div className="class-gallery__toolbar">
                    <span className="class-gallery__counter">{L.counter(approved.length)}</span>
                    <button
                        ref={tvBtnRef}
                        type="button"
                        className="class-gallery__tv-btn"
                        onClick={handleOpenTv}
                        disabled={approved.length === 0}
                    >
                        {L.tvMode}
                    </button>
                    <button
                        type="button"
                        className="class-gallery__pdf-btn"
                        onClick={handleExport}
                        disabled={approved.length === 0 || isExporting}
                    >
                        {isExporting ? L.exporting : L.catalogPdf}
                    </button>
                </div>
            </header>

            {(error || exportError) && (
                <p className="class-gallery__error" role="alert">
                    {error || exportError}
                </p>
            )}

            {isLoading ? (
                <div className="class-gallery__loading" role="status">
                    {L.loading}
                </div>
            ) : approved.length === 0 ? (
                <div className="class-gallery__empty">
                    <div className="class-gallery__empty-emoji" aria-hidden="true">🖼️</div>
                    <h4 className="class-gallery__empty-title">{L.empty}</h4>
                    <p className="class-gallery__empty-hint">{L.emptyHint}</p>
                </div>
            ) : (
                <ul className="class-gallery__grid">
                    {approved.map((row) => {
                        const name = row.nickname || L.anonymousNickname;
                        return (
                            <li key={row.id} className="class-gallery__item">
                                <div className="class-gallery__frame">
                                    <img
                                        className="class-gallery__img"
                                        src={row.image_url}
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
                            </li>
                        );
                    })}
                </ul>
            )}

            {tvOpen && (
                <GallerySlideshow submissions={approved} onClose={handleCloseTv} />
            )}
        </section>
    );
}

// ---- Slideshow (inline for cohesion) --------------------------------------

interface GallerySlideshowProps {
    submissions: SessionSubmission[];
    onClose: () => void;
}

function GallerySlideshow({ submissions, onClose }: GallerySlideshowProps) {
    const [index, setIndex] = useState(0);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const total = submissions.length;

    const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
    const current = total > 0 ? submissions[safeIndex] : null;

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
        const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
        const req = anyEl.requestFullscreen?.bind(anyEl) ?? anyEl.webkitRequestFullscreen?.bind(anyEl);
        if (req) {
            req().catch(() => {
                // Fullscreen denied (e.g. not triggered by a user gesture in
                // some browsers) — the CSS overlay still covers the viewport.
            });
        }
        // Focus the close button for keyboard accessibility.
        closeBtnRef.current?.focus();

        const onFsChange = () => {
            const anyDoc = document as Document & { webkitFullscreenElement?: Element | null };
            if (!document.fullscreenElement && !anyDoc.webkitFullscreenElement) {
                onClose();
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange as EventListener);

        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange as EventListener);
            const anyDoc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
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
            } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Spacebar') {
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

    const name = current?.nickname || L.anonymousNickname;

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
                                key={current.id}
                                className="gallery-slideshow__img"
                                src={current.image_url}
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
