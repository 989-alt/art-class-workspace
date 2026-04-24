/**
 * Copyright certificate page renderer for Art Class Workspace v2.0.
 *
 * Appends an extra A4 portrait page to a jsPDF document describing the
 * provenance of an AI-generated coloring sheet: creation time, curriculum
 * unit, prompt excerpt, model, tool, teacher, license, file hash, and a
 * verification URL.
 *
 * IMPORTANT — font limitations:
 * The certificate page is rendered with jsPDF's default Helvetica font, which
 * does NOT ship Korean glyphs. All *labels* on this page are therefore kept
 * in English ("Created / Unit / Prompt / Model / Tool / Teacher / License /
 * Hash / Verify") so they render cleanly. Some *values* (unit label, teacher
 * name) may contain Korean characters — those will render as placeholder
 * boxes ("tofu") until a Korean font is embedded. A future enhancement can
 * embed a Korean font (~2MB) and switch to a fully Korean layout.
 *
 * QR rendering is deferred to Phase 2. For now the "Verify" box prints the
 * raw URL so a teacher can type it into a browser if needed.
 */

import type { jsPDF } from 'jspdf';

export interface CertificateMetadata {
    createdAt: Date;
    /**
     * e.g. "3-1 미술 「우리 동네의 모습」" — only present for curriculum mode.
     * May contain Korean characters; see font note above.
     */
    unitLabel?: string | null;
    /** First 120 chars of the prompt, with a trailing ellipsis when truncated. */
    promptExcerpt: string;
    aiModel: string; // e.g. "Gemini Nano Banana"
    toolName: string; // e.g. "AI Art Class Workspace v2.0"
    teacherName: string;
    license: string; // e.g. "CC BY-NC 4.0"
    /** SHA-256 hex of (imageBase64 + '|' + promptExcerpt + '|' + createdAt ISO). */
    fileHash: string;
    verifyUrl: string;
}

export interface BuildCertificateMetadataArgs {
    createdAt: Date;
    unitLabel?: string | null;
    prompt: string;
    imageBase64: string;
    aiModel: string;
    toolName: string;
    teacherName: string;
    license: string;
    /**
     * Base URL for the verification page; the short hash is appended as
     * ?h=<16 hex chars>. Defaults to the production SEONBI's Art Class
     * verification endpoint.
     */
    verifyBaseUrl?: string;
}

const DEFAULT_VERIFY_BASE = 'https://s-edu.ai.kr/verify';
const PROMPT_EXCERPT_LIMIT = 120;

export async function buildCertificateMetadata(
    args: BuildCertificateMetadataArgs
): Promise<CertificateMetadata> {
    const promptExcerpt = truncate(args.prompt, PROMPT_EXCERPT_LIMIT);
    const createdAtIso = args.createdAt.toISOString();
    const hashInput = `${args.imageBase64}|${promptExcerpt}|${createdAtIso}`;

    // crypto.subtle is only available in secure contexts (HTTPS / localhost).
    // In insecure contexts (http://LAN-IP in a classroom), fall back to a
    // non-cryptographic fingerprint so PDF export still succeeds. The
    // verification URL is marked 'unavailable' in that path because the
    // backend can't match a non-crypto fingerprint.
    let fileHash: string;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        fileHash = await sha256Hex(hashInput);
    } else {
        fileHash = fallbackFingerprint(hashInput);
    }

    const verifyUrl = fileHash.endsWith('-fallback')
        ? 'unavailable'
        : `${args.verifyBaseUrl ?? DEFAULT_VERIFY_BASE}?h=${fileHash.slice(0, 16)}`;

    return {
        createdAt: args.createdAt,
        unitLabel: args.unitLabel ?? null,
        promptExcerpt,
        aiModel: args.aiModel,
        toolName: args.toolName,
        teacherName: args.teacherName,
        license: args.license,
        fileHash,
        verifyUrl,
    };
}

async function sha256Hex(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Non-cryptographic djb2-style hash, used only when crypto.subtle is
 * unavailable. Returns a 16-hex-char digest suffixed with '-fallback' so
 * the verify-URL path can detect it and avoid constructing a link the
 * backend won't resolve.
 */
function fallbackFingerprint(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h + input.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).padStart(16, '0') + '-fallback';
}

function truncate(input: string, max: number): string {
    if (input.length <= max) return input;
    return input.slice(0, max) + '…';
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function formatTimestamp(d: Date): string {
    return (
        `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
        `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
    );
}

/**
 * Append a single A4 portrait certificate page to the doc and draw the
 * metadata layout. Uses jsPDF primitives only — no external images or fonts.
 */
export function drawCertificatePage(doc: jsPDF, meta: CertificateMetadata): void {
    // Force A4 portrait for the certificate regardless of the main document's
    // paper size / orientation.
    doc.addPage('a4', 'portrait');

    const pageW = 210; // A4 width in mm
    const pageH = 297; // A4 height in mm
    const marginX = 20;
    const contentW = pageW - marginX * 2;

    // Reset styling that the grid pages may have changed.
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20); // near-black
    doc.setDrawColor(60);
    doc.setLineWidth(0.3);

    // --- Header ------------------------------------------------------------
    const titleY = 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    // Emoji deliberately omitted — Helvetica cannot render it.
    doc.text('AI Art Certificate', pageW / 2, titleY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(
        'Provenance record for an AI-generated coloring sheet',
        pageW / 2,
        titleY + 7,
        { align: 'center' }
    );
    doc.setTextColor(20);

    // Top divider
    doc.setLineWidth(0.5);
    doc.line(marginX, titleY + 14, pageW - marginX, titleY + 14);
    doc.setLineWidth(0.3);

    // --- Metadata rows -----------------------------------------------------
    type Row = { label: string; value: string };
    const rows: Row[] = [
        { label: 'Created', value: formatTimestamp(meta.createdAt) },
    ];
    if (meta.unitLabel && meta.unitLabel.trim().length > 0) {
        rows.push({ label: 'Unit', value: meta.unitLabel });
    }
    rows.push(
        { label: 'Prompt', value: meta.promptExcerpt },
        { label: 'Model', value: meta.aiModel },
        { label: 'Tool', value: meta.toolName },
        { label: 'Teacher', value: meta.teacherName },
        { label: 'License', value: meta.license },
        { label: 'Hash', value: meta.fileHash }
    );

    let cursorY = titleY + 24;
    const labelX = marginX;
    const valueX = marginX + 32; // 32mm label column
    const valueWidth = contentW - 32;
    const rowGap = 3;

    doc.setFontSize(11);
    for (const row of rows) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80);
        doc.text(row.label, labelX, cursorY);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20);
        const wrapped = doc.splitTextToSize(row.value, valueWidth);
        doc.text(wrapped, valueX, cursorY);

        // jsPDF line height defaults to fontSize * 1.15 / 2.8346 mm — approx:
        const lineHeightMm = 11 * 0.3528 * 1.15;
        const blockHeight = Math.max(lineHeightMm, wrapped.length * lineHeightMm);
        cursorY += blockHeight + rowGap;
    }

    // --- Verify box --------------------------------------------------------
    const boxTop = Math.max(cursorY + 4, 210);
    const boxHeight = 30;
    doc.setDrawColor(60);
    doc.setLineWidth(0.4);
    doc.rect(marginX, boxTop, contentW, boxHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text('Verify', marginX + 4, boxTop + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20);
    const urlLines = doc.splitTextToSize(meta.verifyUrl, contentW - 8);
    doc.text(urlLines, marginX + 4, boxTop + 14);

    doc.setFontSize(8);
    doc.setTextColor(140);
    // TODO: QR rendering is deferred to Phase 2 (add qrcode lib dependency).
    doc.text(
        'QR code will be embedded in a future release.',
        marginX + 4,
        boxTop + boxHeight - 4
    );

    // --- Bottom divider + disclaimer --------------------------------------
    const footerDividerY = pageH - 28;
    doc.setDrawColor(60);
    doc.setLineWidth(0.5);
    doc.line(marginX, footerDividerY, pageW - marginX, footerDividerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    const disclaimer =
        'For classroom / educational use only. Commercial redistribution ' +
        'prohibited. Contact the teacher for copyright inquiries.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentW);
    doc.text(disclaimerLines, pageW / 2, footerDividerY + 6, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
        'Generated by AI Art Class Workspace',
        pageW / 2,
        pageH - 8,
        { align: 'center' }
    );

    // Reset text color so callers who keep drawing after this don't inherit
    // the muted footer gray. (Certificate page should always be last, but be
    // defensive.)
    doc.setTextColor(20);
}
