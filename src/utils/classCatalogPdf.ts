import { jsPDF } from 'jspdf';

export interface CatalogItem {
    imageUrl: string;
    nickname: string | null;
    /** v3: parent assignment title shown in tile caption + cover. */
    assignmentTitle: string;
}

export interface CatalogMeta {
    classroomName: string;
    classroomCode: string;
    teacherName?: string | null;
    generatedAt?: Date;
}

// A4 portrait dimensions in mm (matches jsPDF 'a4').
const PAGE_W = 210;
const PAGE_H = 297;

// Outer page margin (mm).
const MARGIN_X = 14;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 14;

// Grid layout on body pages: 2 columns × 3 rows = 6 tiles per A4 page.
const COLS = 2;
const ROWS = 3;
const GAP = 8;
// mm reserved at the bottom of each tile for the nickname + assignment caption
const NICK_ROW_HEIGHT = 11;

const ANON_LABEL = '익명'; // "익명"

/**
 * Generate an A4-portrait class catalog PDF for v3 (classroom-scoped):
 *  - cover page with classroom name / classroom code / teacher (optional) /
 *    approved count / generated-at date
 *  - body: 2x3 grid per page, each tile = image + nickname + assignment title
 *
 * Images are loaded through an offscreen canvas with crossOrigin="anonymous"
 * so jsPDF can embed them. If a single image fails (CORS, 404, network), the
 * tile is replaced with a placeholder frame rather than aborting the export.
 */
export async function exportClassCatalog(
    items: CatalogItem[],
    meta: CatalogMeta,
    filename: string = 'class-catalog.pdf'
): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const generatedAt = meta.generatedAt ?? new Date();

    // --- Cover page ---
    drawCoverPage(doc, meta, items.length, generatedAt);

    // --- Body pages ---
    if (items.length > 0) {
        const perPage = COLS * ROWS;
        const pageCount = Math.ceil(items.length / perPage);

        // Pre-resolve each image to a JPEG data URL (or null if it failed).
        const prepared = await Promise.all(items.map((it) => loadImageTile(it.imageUrl)));

        const tileW = (PAGE_W - MARGIN_X * 2 - GAP * (COLS - 1)) / COLS;
        const tileH =
            (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - GAP * (ROWS - 1)) / ROWS;

        for (let pg = 0; pg < pageCount; pg++) {
            doc.addPage('a4', 'portrait');

            // Page header — classroom name on top for context.
            doc.setTextColor(90);
            doc.setFontSize(9);
            doc.text(meta.classroomName, PAGE_W / 2, MARGIN_TOP - 6, {
                align: 'center',
            });

            for (let i = 0; i < perPage; i++) {
                const idx = pg * perPage + i;
                if (idx >= items.length) break;
                const row = Math.floor(i / COLS);
                const col = i % COLS;
                const x = MARGIN_X + col * (tileW + GAP);
                const y = MARGIN_TOP + row * (tileH + GAP);
                drawTile(
                    doc,
                    x,
                    y,
                    tileW,
                    tileH,
                    prepared[idx],
                    items[idx].nickname,
                    items[idx].assignmentTitle,
                    idx + 1
                );
            }
        }
    }

    doc.save(filename);
}

// ---------- internals ----------

interface LoadedTile {
    dataUrl: string;
    width: number; // natural px
    height: number;
}

async function loadImageTile(url: string): Promise<LoadedTile | null> {
    try {
        const img = await loadCrossOriginImage(url);
        const canvas = document.createElement('canvas');
        // Cap the embedded resolution to keep the PDF reasonable in size
        // while still crisp at print resolution (tiles are ~85mm wide).
        const MAX_EDGE = 1200;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w <= 0 || h <= 0) return null;
        const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        // Paint white behind transparent PNGs so JPEG encoding doesn't go grey.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        return { dataUrl, width: w, height: h };
    } catch {
        return null;
    }
}

function loadCrossOriginImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        // Guard falsy URLs: setting `img.src = ''` doesn't fire `onerror`
        // reliably across browsers and leaves the promise pending forever.
        if (!url) {
            reject(new Error('empty url'));
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image load failed'));
        img.src = url;
    });
}

function drawTile(
    doc: jsPDF,
    x: number,
    y: number,
    w: number,
    h: number,
    tile: LoadedTile | null,
    nickname: string | null,
    assignmentTitle: string,
    index: number
): void {
    const imageAreaH = h - NICK_ROW_HEIGHT;

    // Tile frame (light border).
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);

    if (tile) {
        // Contain the image inside the image area preserving aspect ratio.
        const scale = Math.min(
            (w - 2) / tile.width,
            (imageAreaH - 2) / tile.height
        );
        const drawW = tile.width * scale;
        const drawH = tile.height * scale;
        const drawX = x + (w - drawW) / 2;
        const drawY = y + 1 + (imageAreaH - 2 - drawH) / 2;
        try {
            doc.addImage(tile.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
        } catch {
            drawPlaceholder(doc, x, y, w, imageAreaH);
        }
    } else {
        drawPlaceholder(doc, x, y, w, imageAreaH);
    }

    // Caption block — nickname (line 1) + assignment title (line 2).
    const label = nickname && nickname.trim().length > 0 ? nickname : ANON_LABEL;
    doc.setDrawColor(235);
    doc.line(x + 2, y + imageAreaH, x + w - 2, y + imageAreaH);

    doc.setTextColor(50);
    doc.setFontSize(10);
    const maxNickW = w - 12;
    const safeNick = ellipsize(doc, label, maxNickW);
    doc.text(safeNick, x + w / 2, y + imageAreaH + 4.5, { align: 'center' });

    if (assignmentTitle && assignmentTitle.trim().length > 0) {
        doc.setTextColor(140);
        doc.setFontSize(8);
        const maxTitleW = w - 6;
        const safeTitle = ellipsize(doc, assignmentTitle, maxTitleW);
        doc.text(safeTitle, x + w / 2, y + imageAreaH + 9, { align: 'center' });
    }

    // Index badge top-left for print catalog reference.
    doc.setTextColor(170);
    doc.setFontSize(8);
    doc.text(`#${index}`, x + 2, y + 4);
}

function drawPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number): void {
    doc.setFillColor(245, 245, 245);
    doc.rect(x + 1, y + 1, w - 2, h - 2, 'F');
    doc.setTextColor(180);
    doc.setFontSize(8);
    doc.text('이미지 없음', x + w / 2, y + h / 2, { align: 'center' });
    // "이미지 없음"
}

function drawCoverPage(
    doc: jsPDF,
    meta: CatalogMeta,
    approvedCount: number,
    generatedAt: Date
): void {
    // Big title.
    doc.setTextColor(40);
    doc.setFontSize(28);
    doc.text('학급 전시 카탈로그', PAGE_W / 2, 60, { align: 'center' });
    // "학급 전시 카탈로그"

    // Decorative rule.
    doc.setDrawColor(180);
    doc.setLineWidth(0.4);
    doc.line(PAGE_W / 2 - 30, 68, PAGE_W / 2 + 30, 68);

    // Classroom block.
    doc.setTextColor(30);
    doc.setFontSize(20);
    doc.text(meta.classroomName, PAGE_W / 2, 92, { align: 'center' });

    // Facts grid — two columns.
    const leftLabelX = 60;
    const rightValueX = PAGE_W - 60;
    const rowY = 130;
    const gap = 10;
    doc.setFontSize(11);

    const rows: Array<[string, string]> = [
        ['학급 코드', meta.classroomCode], // "학급 코드"
        ['승인 작품 수', `${approvedCount}`], // "승인 작품 수"
        ['생성일', formatDateKorean(generatedAt)], // "생성일"
    ];
    if (meta.teacherName && meta.teacherName.trim().length > 0) {
        rows.push(['교사', meta.teacherName]); // "교사"
    }

    rows.forEach(([label, value], i) => {
        const y = rowY + i * gap;
        doc.setTextColor(140);
        doc.text(label, leftLabelX, y);
        doc.setTextColor(40);
        doc.text(value, rightValueX, y, { align: 'right' });
    });

    // Footer byline on the cover.
    doc.setTextColor(160);
    doc.setFontSize(9);
    doc.text(
        "SEONBI's Art Class",
        PAGE_W / 2,
        PAGE_H - 25,
        { align: 'center' }
    );
}

function formatDateKorean(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function ellipsize(doc: jsPDF, text: string, maxWidthMm: number): string {
    if (doc.getTextWidth(text) <= maxWidthMm) return text;
    const ell = '…'; // …
    let lo = 0;
    let hi = text.length;
    let best = '';
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const candidate = text.slice(0, mid) + ell;
        if (doc.getTextWidth(candidate) <= maxWidthMm) {
            best = candidate;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return best || ell;
}
