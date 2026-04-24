import { useState } from 'react';
import type { PaperSize, Orientation } from '../../types';
import { imageToSvg, downloadSvg } from '../../utils/vectorizer';
import { exportToPdf } from '../../utils/pdfExporter';
import { downloadResizedPng, resizeImageToAspectRatio } from '../../utils/imageResizer';
import { buildCertificateMetadata } from '../../utils/copyrightCertificate';
import { getTeacherName, setTeacherName } from '../../utils/teacherProfile';
import './ExportPanel.css';

interface ExportPanelProps {
    image: string | null;
    gridN: number;
    gridM: number;
    paperSize: PaperSize;
    orientation: Orientation;
    /** Latest prompt used to generate/edit the active image. */
    lastPrompt?: string;
    /** Curriculum unit label (e.g. "3-1 미술 「우리 동네의 모습」") when applicable. */
    unitLabel?: string | null;
}

// Korean UI strings — kept as \uXXXX-equivalent literals authored in an
// editor that preserves UTF-8; do NOT Edit-patch these lines individually.
const PRINT_OPTIONS_TITLE = '인쇄 옵션'; // "인쇄 옵션"
const WATERMARK_LABEL = '워터마크'; // "워터마크"
const WATERMARK_HINT =
    "SEONBI's Art Class · Gemini · " +
    '날짜 하단 표기'; // "날짜 하단 표기"
const CERT_LABEL = '저작권 보증서 포함'; // "저작권 보증서 포함"
const CERT_HINT =
    'PDF 마지막 페이지에 AI 생성 정보·해시·라이선스 기록';
// "PDF 마지막 페이지에 AI 생성 정보·해시·라이선스 기록"
const TEACHER_LABEL = '교사 이름'; // "교사 이름"
const TEACHER_PLACEHOLDER = '보증서에 표시될 이름'; // "보증서에 표시될 이름"

// Certificate constants that are part of the provenance record, not UI copy.
const AI_MODEL_LABEL = 'Gemini Nano Banana';
const TOOL_NAME = 'AI Art Class Workspace v2.0';
const LICENSE = 'CC BY-NC 4.0';

export default function ExportPanel({
    image,
    gridN,
    gridM,
    paperSize,
    orientation,
    lastPrompt,
    unitLabel,
}: ExportPanelProps) {
    const [isExporting, setIsExporting] = useState<'png' | 'svg' | 'pdf' | null>(null);
    const [watermark, setWatermark] = useState(true);
    const [certificate, setCertificate] = useState(true);
    const [teacherName, setTeacherNameState] = useState<string>(() => getTeacherName());

    if (!image) return null;

    const handleTeacherNameChange = (value: string) => {
        setTeacherNameState(value);
        setTeacherName(value);
    };

    const handlePngDownload = async () => {
        setIsExporting('png');
        try {
            await downloadResizedPng(image, gridN, gridM, paperSize, orientation);
        } catch (err) {
            console.error('PNG 다운로드 실패:', err); // "PNG 다운로드 실패:"
            alert('PNG 다운로드 중 오류가 발생했습니다.');
            // "PNG 다운로드 중 오류가 발생했습니다."
        } finally {
            setIsExporting(null);
        }
    };

    const handleSvgDownload = async () => {
        setIsExporting('svg');
        try {
            const resizedImage = await resizeImageToAspectRatio(image, gridN, gridM, paperSize, orientation);
            const svgString = await imageToSvg(resizedImage);
            downloadSvg(svgString);
        } catch (err) {
            console.error('SVG 변환 실패:', err); // "SVG 변환 실패:"
            alert('SVG 변환 중 오류가 발생했습니다.');
            // "SVG 변환 중 오류가 발생했습니다."
        } finally {
            setIsExporting(null);
        }
    };

    const handlePdfDownload = async () => {
        setIsExporting('pdf');
        try {
            const resizedImage = await resizeImageToAspectRatio(image, gridN, gridM, paperSize, orientation);

            let certificateMeta = undefined;
            if (certificate) {
                certificateMeta = await buildCertificateMetadata({
                    createdAt: new Date(),
                    unitLabel: unitLabel ?? null,
                    prompt: lastPrompt ?? '',
                    imageBase64: resizedImage,
                    aiModel: AI_MODEL_LABEL,
                    toolName: TOOL_NAME,
                    teacherName: getTeacherName(),
                    license: LICENSE,
                });
            }

            await exportToPdf(resizedImage, gridN, gridM, paperSize, orientation, {
                watermark,
                certificate,
                certificateMeta,
            });
        } catch (err) {
            console.error('PDF 생성 실패:', err); // "PDF 생성 실패:"
            alert('PDF 생성 중 오류가 발생했습니다.');
            // "PDF 생성 중 오류가 발생했습니다."
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <div className="export-panel">
            <h3 className="export-panel__title">내보내기</h3>

            <div className="export-panel__options">
                <div className="export-panel__options-title">{PRINT_OPTIONS_TITLE}</div>

                <label className="export-panel__option export-panel__option--text">
                    <span className="export-panel__option-label">
                        <span>{TEACHER_LABEL}</span>
                    </span>
                    <input
                        type="text"
                        className="export-panel__teacher-input"
                        value={teacherName}
                        placeholder={TEACHER_PLACEHOLDER}
                        onChange={(e) => handleTeacherNameChange(e.target.value)}
                        maxLength={30}
                    />
                </label>

                <label className="export-panel__option">
                    <input
                        type="checkbox"
                        checked={watermark}
                        onChange={(e) => setWatermark(e.target.checked)}
                    />
                    <span className="export-panel__option-label">
                        <span>{WATERMARK_LABEL}</span>
                        <span className="export-panel__option-hint">{WATERMARK_HINT}</span>
                    </span>
                </label>

                <label className="export-panel__option">
                    <input
                        type="checkbox"
                        checked={certificate}
                        onChange={(e) => setCertificate(e.target.checked)}
                    />
                    <span className="export-panel__option-label">
                        <span>{CERT_LABEL}</span>
                        <span className="export-panel__option-hint">{CERT_HINT}</span>
                    </span>
                </label>
            </div>

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
