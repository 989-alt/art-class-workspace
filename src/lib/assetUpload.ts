import { getSupabase } from './supabaseClient';

const BUCKET = 'classroom-assets';
const NOT_CONFIGURED = 'Supabase is not configured.';

export interface AssetUploadResult {
    path: string;
    publicUrl: string;
}

/**
 * Decode a base64-encoded PNG payload (without the `data:image/png;base64,`
 * prefix) into a Uint8Array suitable for Supabase Storage uploads.
 */
function base64ToBytes(base64: string): Uint8Array {
    const cleaned = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function buildPath(classroomId: string): string {
    const ts = Date.now();
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${ts}-${Math.random().toString(36).slice(2, 10)}`;
    return `${classroomId}/${ts}-${uuid}.png`;
}

/**
 * Uploads a teacher-generated PNG (base64-encoded, no prefix) to the
 * `classroom-assets` Storage bucket and returns its public URL.
 *
 * Requires the bucket to be marked Public in the Supabase dashboard
 * (see SUPABASE_SETUP.md step 4).
 */
export async function uploadClassroomAsset(
    classroomId: string,
    base64Png: string,
): Promise<AssetUploadResult> {
    const supabase = getSupabase();
    if (!supabase) throw new Error(NOT_CONFIGURED);

    const bytes = base64ToBytes(base64Png);
    const path = buildPath(classroomId);

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
            contentType: 'image/png',
            upsert: false,
            cacheControl: '3600',
        });

    if (uploadError) {
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
