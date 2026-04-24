import type { GalleryItem } from '../../types';
import './Gallery.css';

interface GalleryProps {
    items: GalleryItem[];
    selectedIds: Set<string>;
    onSelect: (id: string) => void;
    onToggleSelect: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onDownloadSelected: () => void;
    onDownloadAll: () => void;
}

export default function Gallery({
    items,
    selectedIds,
    onSelect,
    onToggleSelect,
    onSelectAll,
    onDeselectAll,
    onDownloadSelected,
    onDownloadAll,
}: GalleryProps) {
    if (items.length === 0) {
        return (
            <div className="gallery gallery--empty">
                <div className="gallery__empty-icon" aria-hidden="true">🖼️</div>
                <h3>갤러리가 비어 있습니다</h3>
                <p>도안을 생성하면 이곳에 저장됩니다</p>
            </div>
        );
    }

    const allSelected = selectedIds.size === items.length;
    const someSelected = selectedIds.size > 0;

    return (
        <div className="gallery">
            <div className="gallery__header">
                <h3 className="gallery__title">
                    <span aria-hidden="true">🖼️</span> 갤러리 <span className="gallery__count">{items.length}개</span>
                </h3>
                <div className="gallery__actions">
                    <button
                        className="gallery__action-btn"
                        onClick={allSelected ? onDeselectAll : onSelectAll}
                    >
                        {allSelected ? '선택 해제' : '전체 선택'}
                    </button>
                    <button
                        className="gallery__action-btn gallery__action-btn--primary"
                        onClick={onDownloadSelected}
                        disabled={!someSelected}
                    >
                        📥 선택 다운로드 ({selectedIds.size})
                    </button>
                    <button
                        className="gallery__action-btn"
                        onClick={onDownloadAll}
                    >
                        📦 전체 다운로드
                    </button>
                </div>
            </div>

            <ul className="gallery__grid">
                {items.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    const label = item.config.mode === 'mandala'
                        ? '만다라 도안'
                        : `${item.config.topic.slice(0, 20)} 도안`;
                    return (
                        <li
                            key={item.id}
                            className={`gallery__item ${isSelected ? 'gallery__item--selected' : ''}`}
                        >
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={isSelected}
                                aria-label={`${label} 선택`}
                                className="gallery__checkbox"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect(item.id);
                                }}
                            >
                                {isSelected ? '✓' : ''}
                            </button>
                            <button
                                type="button"
                                className="gallery__thumbnail-btn"
                                onClick={() => onSelect(item.id)}
                                aria-label={`${label} 상세 보기`}
                            >
                                <img
                                    className="gallery__thumbnail"
                                    src={`data:image/png;base64,${item.image}`}
                                    alt={label}
                                />
                            </button>
                            <div className="gallery__item-info">
                                <span className="gallery__item-mode">
                                    {item.config.mode === 'mandala' ? '🔮 만다라' : `✏️ ${item.config.topic.slice(0, 10)}`}
                                </span>
                                <span className="gallery__item-time">
                                    {formatTime(item.createdAt)}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
