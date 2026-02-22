import { useState } from 'react';
import type { PaperSize, Orientation } from '../../types';
import { imageToSvg, downloadSvg } from '../../utils/vectorizer';
import { exportToPdf } from '../../utils/pdfExporter';
import { downloadResizedPng, resizeImageToAspectRatio } from '../../utils/imageResizer';
import './ExportPanel.css';

interface ExportPanelProps {
    image: string | null;
    gridN: number;
    gridM: number;
    paperSize: PaperSize;
    orientation: Orientation;
}

export default function ExportPanel({ image, gridN, gridM, paperSize, orientation }: ExportPanelProps) {
    const [isExporting, setIsExporting] = useState<'png' | 'svg' | 'pdf' | null>(null);

    if (!image) return null;

    const handlePngDownload = async () => {
        setIsExporting('png');
        try {
            await downloadResizedPng(image, gridN, gridM, paperSize, orientation);
        } catch (err) {
            console.error('PNG 다운로드 실패:', err);
            alert('PNG 다운로드 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(null);
        }
    };

    const handleSvgDownload = async () => {
        setIsExporting('svg');
        try {
            // Resize image first, then convert to SVG
            const resizedImage = await resizeImageToAspectRatio(image, gridN, gridM, paperSize, orientation);
            const svgString = await imageToSvg(resizedImage);
            downloadSvg(svgString);
        } catch (err) {
            console.error('SVG 변환 실패:', err);
            alert('SVG 변환 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(null);
        }
    };

    const handlePdfDownload = async () => {
        setIsExporting('pdf');
        try {
            // Resize image first, then export to PDF
            const resizedImage = await resizeImageToAspectRatio(image, gridN, gridM, paperSize, orientation);
            await exportToPdf(resizedImage, gridN, gridM, paperSize, orientation);
        } catch (err) {
            console.error('PDF 생성 실패:', err);
            alert('PDF 생성 중 오류가 발생했습니다.');
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="export-panel">
            <h3 className="export-panel__title">내보내기</h3>
            <div className="export-panel__buttons">
                <button
                    className="export-panel__btn export-panel__btn--png"
                    onClick={handlePngDownload}
                    disabled={!!isExporting}
                >
                    {isExporting === 'png' ? (
                        <><span className="spinner spinner--sm" /> 처리 중...</>
                    ) : (
                        '🖼️ PNG 원본'
                    )}
                </button>
                <button
                    className="export-panel__btn export-panel__btn--svg"
                    onClick={handleSvgDownload}
                    disabled={!!isExporting}
                >
                    {isExporting === 'svg' ? (
                        <><span className="spinner spinner--sm" /> 변환 중...</>
                    ) : (
                        '📐 SVG 벡터'
                    )}
                </button>
                <button
                    className="export-panel__btn export-panel__btn--pdf"
                    onClick={handlePdfDownload}
                    disabled={!!isExporting}
                >
                    {isExporting === 'pdf' ? (
                        <><span className="spinner spinner--sm" /> 생성 중...</>
                    ) : (
                        `📄 PDF ${gridN}×${gridM} ${paperSize}`
                    )}
                </button>
            </div>
        </div>
    );
}
