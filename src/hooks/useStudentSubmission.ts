import { useCallback, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SessionSubmission } from '../types/classroom';
import { uploadSubmission } from '../lib/imageUpload';

export interface UseStudentSubmissionReturn {
    submission: SessionSubmission | null;
    isUploading: boolean;
    error: string | null;
    submit: (blob: Blob, nickname?: string | null) => Promise<void>;
}

const NOT_CONFIGURED = '학급 모드가 구성되지 않았습니다';
const NO_SESSION = '세션이 없습니다';

/**
 * Student-side submission lifecycle (insert-only, local-state-only).
 *
 * Anonymous clients cannot read back pending submissions or delete any rows
 * (supabase/migrations/0007_fix_submission_rls.sql). The UX is therefore
 * driven entirely from this hook's local state:
 *
 *  - Mount always starts with submission=null. On page refresh the student
 *    sees the photo-picker again.
 *  - submit(blob) uploads to Storage and INSERTs a new pending row, storing
 *    it as local state. Visually replaces any previous preview.
 *  - Re-submits produce additional pending rows; the teacher approves one
 *    and ignores/unapproves the others. Stale rows cascade-delete when the
 *    24h-TTL session expires.
 */
export function useStudentSubmission(
    sessionId: string | null | undefined,
    studentToken: string
): UseStudentSubmissionReturn {
    const [submission, setSubmission] = useState<SessionSubmission | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = useCallback(
        async (blob: Blob, nickname?: string | null): Promise<void> => {
            if (!isSupabaseConfigured()) throw new Error(NOT_CONFIGURED);
            const supabase = getSupabase();
            if (!supabase) throw new Error(NOT_CONFIGURED);
            if (!sessionId) throw new Error(NO_SESSION);

            setIsUploading(true);
            setError(null);
            try {
                const { publicUrl } = await uploadSubmission(
                    sessionId,
                    studentToken,
                    blob
                );

                const { data, error: insertErr } = await supabase
                    .from('session_submissions')
                    .insert({
                        session_id: sessionId,
                        student_token: studentToken,
                        nickname: nickname ?? null,
                        image_url: publicUrl,
                        approved: false,
                    })
                    .select()
                    .single();
                if (insertErr) throw new Error(insertErr.message);
                setSubmission(data as SessionSubmission);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [sessionId, studentToken]
    );

    return {
        submission,
        isUploading,
        error,
        submit,
    };
}
