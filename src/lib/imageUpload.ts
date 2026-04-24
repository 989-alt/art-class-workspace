import { getSupabase } from './supabaseClient';

const BUCKET = 'classroom-submissions';
const NOT_CONFIGURED = 'Supabase is not configured.';

/**
 * Resize + JPEG-compress an image on the client using <canvas>.
 * Prevents 10+ MB phone photos from being uploaded as-is.
 *
 * @param file    Source file from <input type="file">.
 * @param maxDim  Longest-edge cap in pixels (default 1600). Aspect preserved.
 * @param quality JPEG quality 0..1 (default 0.8).
 */
export async function resizeAndCompressImage(
    file: File,
    maxDim: number = 1600,
    quality: number = 0.8
): Promise<Blob> {
    if (typeof document === 'undefined') {
        throw new Error('Image resize requires a browser environment.');
    }
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) {
        throw new Error('이미지를 읽지 못했습니다.');
    }

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, dstW, dstH);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
    if (!blob) throw new Error('이미지 변환에 실패했습니다.');
    return blob;
}

function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
        reader.readAsDataURL(file);
    });
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = src;
    });
}

export interface UploadResult {
    path: string;
    publicUrl: string;
}

/**
 * Uploads a blob to `classroom-submissions/{sessionId}/{studentToken}-{ts}.jpg`
 * and returns the public URL. Requires the bucket to be marked Public in the
 * Supabase dashboard (see SUPABASE_SETUP.md step 4).
 */
export async function uploadSubmission(
    sessionId: string,
    studentToken: string,
    blob: Blob
): Promise<UploadResult> {
    const supabase = getSupabase();
    if (!supabase) throw new Error(NOT_CONFIGURED);

    const timestamp = Date.now();
    const safeToken = studentToken.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
    const path = `${sessionId}/${safeToken}-${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
            contentType: 'image/jpeg',
            upsert: false,
            cacheControl: '3600',
        });

    if (uploadError) {
        // Surface a helpful hint when the bucket wasn't created yet.
        const msg = uploadError.message || String(uploadError);
        if (/bucket.*not.*found/i.test(msg) || /not.*exist/i.test(msg)) {
            throw new Error(
                `Storage 버킷 "${BUCKET}"을(를) 찾을 수 없습니다. SUPABASE_SETUP.md 4단계를 확인하세요.`
            );
        }
        throw new Error(msg || '업로드 실패');
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
}

/**
 * Best-effort removal of a previously uploaded Storage object. Failure is
 * non-fatal — the caller should still be able to re-upload.
 */
export async function removeStorageObject(path: string): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    try {
        await supabase.storage.from(BUCKET).remove([path]);
    } catch {
        // best-effort; ignore
    }
}

/**
 * Derives the Storage object path from a public URL produced by
 * `getPublicUrl()`. Used when we only have the URL stored in the DB row.
 */
export function storagePathFromPublicUrl(publicUrl: string): string | null {
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) return null;
    return publicUrl.slice(idx + marker.length);
}
