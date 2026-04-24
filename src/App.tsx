import { useState, useCallback, useRef } from 'react';
import { useApiKey } from './hooks/useApiKey';
import { useGeneration } from './hooks/useGeneration';
import { useHistory } from './hooks/useHistory';
import { exportToZip } from './utils/zipExporter';
import { applyLineWeightBoost } from './utils/lineWeightBoost';
import type { GalleryItem, GenerationConfig, PaperSize, Orientation } from './types';

import Header from './components/common/Header';
import Toast from './components/common/Toast';
import ApiKeySetup from './components/Onboarding/ApiKeySetup';
import GeneratorForm from './components/Form/GeneratorForm';
import CanvasPreview from './components/Canvas/CanvasPreview';
import SkeletonLoader from './components/Canvas/SkeletonLoader';
import QuickEditBar from './components/Canvas/QuickEditBar';
import HistoryStack from './components/History/HistoryStack';
import ExportPanel from './components/Export/ExportPanel';
import Gallery from './components/Gallery/Gallery';

// TODO(v3-T2/T4): Classroom and student routes are temporarily disabled while
// the v3 LMS architecture is wired up. Lazy imports for SessionHost,
// StudentVoteView, and TeacherAuthGate were removed in v3-T0.

import './App.css';

type ViewMode = 'generator' | 'gallery' | 'detail';

// "선 굵기 +20% 보정이 적용되었습니다."
const BOOST_APPLIED_MESSAGE = '선 굵기 +20% 보정이 적용되었습니다.';
// "이미 적용됨"
const BOOST_ALREADY_MESSAGE = '이미 적용됨';
// "선 굵기 보정 중 오류가 발생했습니다."
const BOOST_ERROR_MESSAGE = '선 굵기 보정 중 오류가 발생했습니다.';

export default function App() {
  // TODO(v3-T4): v2 student vote route was removed in v3-T0; v3 will introduce
  // /class/:code instead.

  const { apiKey, hasApiKey, isLoaded, setApiKey, clearApiKey } = useApiKey();
  const { currentImage, isLoading, generationProgress, generate, edit, setCurrentImage, toast, setToast, clearToast } = useGeneration();
  const { historyCount, maxDepth, canUndo, push, undo, clear } = useHistory();
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [gridN, setGridN] = useState(1);
  const [gridM, setGridM] = useState(1);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('vertical');

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('generator');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  // Line-boost applied flags — per active item id. Prevents stacking the
  // dilation effect when the teacher clicks "적용" multiple times.
  const [boostedIds, setBoostedIds] = useState<Set<string>>(new Set());

  // UI-reactive loading flag while the boost runs; also used to gate the button.
  const [isBoosting, setIsBoosting] = useState(false);
  // Synchronous in-flight guard — blocks duplicate entries during the await
  // window that state batching cannot prevent (double-clicks within ~500ms).
  const isBoostingRef = useRef(false);

  const handleGenerate = useCallback(
    async (config: GenerationConfig, count: number) => {
      if (!apiKey) return;
      setGridN(config.gridN);
      setGridM(config.gridM);
      setPaperSize(config.paperSize);
      setOrientation(config.orientation);
      clear();

      // Switch to gallery view if generating multiple
      if (count > 1) {
        setViewMode('gallery');
      }

      await generate(apiKey, config, count, (item) => {
        setGallery((prev) => [item, ...prev]);
        // For single generation, also set as current image
        if (count === 1) {
          setCurrentImage(item.image);
          setActiveItem(item);
          setViewMode('detail');
        }
      });
    },
    [apiKey, generate, clear, setCurrentImage]
  );

  // Gallery item selected - go to detail view
  const handleSelectItem = useCallback((id: string) => {
    const item = gallery.find((g) => g.id === id);
    if (item) {
      setActiveItem(item);
      setCurrentImage(item.image);
      setGridN(item.config.gridN);
      setGridM(item.config.gridM);
      setPaperSize(item.config.paperSize);
      setOrientation(item.config.orientation);
      clear();
      setViewMode('detail');
    }
  }, [gallery, setCurrentImage, clear]);

  // Toggle item selection for download
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(gallery.map((g) => g.id)));
  }, [gallery]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDownloadSelected = useCallback(async () => {
    const items = gallery.filter((g) => selectedIds.has(g.id));
    if (items.length > 0) {
      await exportToZip(items, 'art-class-selected.zip');
    }
  }, [gallery, selectedIds]);

  const handleDownloadAll = useCallback(async () => {
    if (gallery.length > 0) {
      await exportToZip(gallery, 'art-class-all.zip');
    }
  }, [gallery]);

  const handleBackToGallery = useCallback(() => {
    setViewMode('gallery');
    setActiveItem(null);
  }, []);

  // Push to history whenever currentImage changes from generation
  const handleEdit = useCallback(
    async (editType: string) => {
      if (!apiKey || !currentImage) return;
      // Save current before edit
      push(currentImage);
      await edit(apiKey, editType);

      // Update the gallery item with edited image
      if (activeItem) {
        setGallery((prev) =>
          prev.map((g) =>
            g.id === activeItem.id ? { ...g, image: currentImage } : g
          )
        );
      }
    },
    [apiKey, currentImage, push, edit, activeItem]
  );

  // Update gallery when image is edited
  const handleImageEdited = useCallback(() => {
    if (activeItem && currentImage) {
      setGallery((prev) =>
        prev.map((g) =>
          g.id === activeItem.id ? { ...g, image: currentImage } : g
        )
      );
      setActiveItem((prev) => prev ? { ...prev, image: currentImage } : null);
    }
  }, [activeItem, currentImage]);

  const handleUndo = useCallback(() => {
    const previousImage = undo();
    if (previousImage) {
      setCurrentImage(previousImage);
      // If we're reverting past a boost application, clear the boosted flag
      // so the user can re-apply it without hitting the "이미 적용됨" guard.
      if (activeItem) {
        setBoostedIds((prev) => {
          if (!prev.has(activeItem.id)) return prev;
          const next = new Set(prev);
          next.delete(activeItem.id);
          return next;
        });
      }
      handleImageEdited();
    }
  }, [undo, setCurrentImage, handleImageEdited, activeItem]);

  // Apply line-weight boost to the current image. Idempotent per gallery item:
  // if already applied, show a subtle toast and bail out.
  const handleApplyLineBoost = useCallback(async () => {
    if (!currentImage || !activeItem) return;
    // Guard against double-clicks within the async window. setState would
    // queue but not flush in time, so we use a synchronous ref.
    if (isBoostingRef.current) return;
    if (boostedIds.has(activeItem.id)) {
      setToast({ id: '', type: 'warning', message: BOOST_ALREADY_MESSAGE });
      return;
    }
    // Capture the pre-boost image BEFORE the await so the value pushed to
    // history and passed to the boost function cannot be mutated from under us.
    const preBoost = currentImage;
    try {
      isBoostingRef.current = true;
      setIsBoosting(true);
      const boosted = await applyLineWeightBoost(preBoost);
      push(preBoost); // preserve pre-boost for undo
      setCurrentImage(boosted);
      // Reflect in gallery and active item
      setGallery((prev) =>
        prev.map((g) =>
          g.id === activeItem.id ? { ...g, image: boosted } : g
        )
      );
      setActiveItem((prev) => (prev ? { ...prev, image: boosted } : null));
      setBoostedIds((prev) => {
        const next = new Set(prev);
        next.add(activeItem.id);
        return next;
      });
      setToast({ id: '', type: 'success', message: BOOST_APPLIED_MESSAGE });
    } catch (err) {
      console.error('Line boost failed:', err);
      setToast({ id: '', type: 'error', message: BOOST_ERROR_MESSAGE });
    } finally {
      isBoostingRef.current = false;
      setIsBoosting(false);
    }
  }, [currentImage, activeItem, boostedIds, push, setCurrentImage, setToast]);

  const handleKeySet = useCallback(
    (key: string) => {
      setApiKey(key);
      setShowKeySetup(false);
    },
    [setApiKey]
  );

  const handleSettingsClick = useCallback(() => {
    setShowKeySetup(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearApiKey();
    setShowKeySetup(false);
  }, [clearApiKey]);

  // Wait for localStorage load
  if (!isLoaded) return null;

  // Show onboarding or key setup modal
  if (!hasApiKey || showKeySetup) {
    return (
      <>
        <Toast toast={toast} onClose={clearToast} />
        {showKeySetup && hasApiKey ? (
          <div className="key-modal-overlay" onClick={() => setShowKeySetup(false)}>
            <div className="key-modal" onClick={(e) => e.stopPropagation()}>
              <div className="key-modal__header">
                <h2>API 키 설정</h2>
                <button
                  className="key-modal__close"
                  onClick={() => setShowKeySetup(false)}
                  aria-label="닫기"
                >×</button>
              </div>
              <ApiKeySetup onKeySet={handleKeySet} />
              <button className="key-modal__logout" onClick={handleLogout}>
                🗑️ 키 삭제 및 로그아웃
              </button>
            </div>
          </div>
        ) : (
          <ApiKeySetup onKeySet={handleKeySet} />
        )}
      </>
    );
  }

  return (
    <div className="app">
      <Toast toast={toast} onClose={clearToast} />
      <Header apiKey={apiKey} onSettingsClick={handleSettingsClick} />

      <main className="workspace">
        {/* Left Panel */}
        <aside className="workspace__sidebar">
          <GeneratorForm
            isLoading={isLoading}
            onGenerate={handleGenerate}
            onToast={setToast}
          />
          {viewMode === 'detail' && currentImage && (
            <ExportPanel
              image={currentImage}
              gridN={gridN}
              gridM={gridM}
              paperSize={paperSize}
              orientation={orientation}
            />
          )}

          {/* Gallery link when not in gallery view */}
          {gallery.length > 0 && viewMode !== 'gallery' && (
            <button
              className="sidebar__gallery-btn"
              onClick={() => setViewMode('gallery')}
            >
              🖼️ 갤러리 보기 ({gallery.length})
            </button>
          )}
        </aside>

        {/* Right Panel */}
        <section className="workspace__canvas">
          {/* Generator/Empty View */}
          {viewMode === 'generator' && !isLoading && (
            <div className="workspace__empty">
              <div className="workspace__empty-icon" aria-hidden="true">🖌️</div>
              <h2>도안을 생성해 보세요</h2>
              <p>왼쪽 패널에서 모드, 주제, 난이도를 설정한 후<br />"도안 생성" 버튼을 클릭하세요.</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <SkeletonLoader
              isVisible={isLoading}
              progress={generationProgress}
              gridN={gridN}
              gridM={gridM}
              paperSize={paperSize}
              orientation={orientation}
            />
          )}

          {/* Gallery View */}
          {viewMode === 'gallery' && !isLoading && (
            <Gallery
              items={gallery}
              selectedIds={selectedIds}
              onSelect={handleSelectItem}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onDownloadSelected={handleDownloadSelected}
              onDownloadAll={handleDownloadAll}
            />
          )}

          {/* Detail View */}
          {viewMode === 'detail' && !isLoading && (
            <>
              {/* Back button */}
              {gallery.length > 0 && (
                <button
                  className="workspace__back-btn"
                  onClick={handleBackToGallery}
                >
                  ← 갤러리로 돌아가기
                </button>
              )}

              <CanvasPreview
                image={currentImage}
                gridN={gridN}
                gridM={gridM}
                paperSize={paperSize}
                orientation={orientation}
                isLoading={isLoading}
                isBoosting={isBoosting}
                onApplyLineBoost={handleApplyLineBoost}
              />

              {currentImage && (
                <div className="workspace__actions">
                  <HistoryStack
                    historyCount={historyCount}
                    maxDepth={maxDepth}
                    canUndo={canUndo}
                    isLoading={isLoading}
                    onUndo={handleUndo}
                  />
                  <QuickEditBar
                    isVisible={!!currentImage}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                  />
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
