import { useState, useCallback } from 'react';
import { useApiKey } from './hooks/useApiKey';
import { useGeneration } from './hooks/useGeneration';
import { useHistory } from './hooks/useHistory';
import { exportToZip } from './utils/zipExporter';
import type { GenerationConfig, GalleryItem, PaperSize, Orientation } from './types';

import Header from './components/common/Header';
import Toast from './components/common/Toast';
import GeneratorForm from './components/Form/GeneratorForm';
import CanvasPreview from './components/Canvas/CanvasPreview';
import SkeletonLoader from './components/Canvas/SkeletonLoader';
import QuickEditBar from './components/Canvas/QuickEditBar';
import HistoryStack from './components/History/HistoryStack';
import ExportPanel from './components/Export/ExportPanel';
import Gallery from './components/Gallery/Gallery';

import './App.css';

type ViewMode = 'generator' | 'gallery' | 'detail';

export default function App() {
  const { apiKey } = useApiKey();
  const { currentImage, isLoading, generationProgress, generate, edit, setCurrentImage, toast, clearToast } = useGeneration();
  const { historyCount, maxDepth, canUndo, push, undo, clear } = useHistory();
  const [gridN, setGridN] = useState(1);
  const [gridM, setGridM] = useState(1);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('vertical');

  // Gallery state
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('generator');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

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
      handleImageEdited();
    }
  }, [undo, setCurrentImage, handleImageEdited]);

  return (
    <div className="app">
      <Toast toast={toast} onClose={clearToast} />
      <Header />

      <main className="workspace">
        {/* Left Panel */}
        <aside className="workspace__sidebar">
          <GeneratorForm
            isLoading={isLoading}
            onGenerate={handleGenerate}
          />
          {viewMode === 'detail' && currentImage && (
            <ExportPanel image={currentImage} gridN={gridN} gridM={gridM} paperSize={paperSize} orientation={orientation} />
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
              <div className="workspace__empty-icon">🖌️</div>
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
