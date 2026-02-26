import type { ArtStyle } from '../../types';
import { ART_STYLE_LABELS } from '../../types';
import './StyleSelector.css';

interface StyleSelectorProps {
    artStyle: ArtStyle;
    onStyleChange: (style: ArtStyle) => void;
    disabled?: boolean;
}

export default function StyleSelector({ artStyle, onStyleChange, disabled }: StyleSelectorProps) {
    const styles: ArtStyle[] = [
        'line-art',
        'still-life',
        'watercolor',
        'oil-painting',
        'pointillism',
        'calligraphy'
    ];

    return (
        <div className="gen-form__field">
            <label className="gen-form__label">작풍 선택</label>
            <div className="style-selector">
                {styles.map((style) => (
                    <button
                        key={style}
                        type="button"
                        className={`style-selector__btn ${artStyle === style ? 'active' : ''}`}
                        onClick={() => onStyleChange(style)}
                        disabled={disabled}
                    >
                        {ART_STYLE_LABELS[style]}
                    </button>
                ))}
            </div>
        </div>
    );
}
