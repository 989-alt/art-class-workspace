import { useCallback, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AssignmentSubmission } from '../types/classroom';
import { uploadSubmission } from '../lib/imageUpload';

export interface UseStudentSubmissionReturn {
    submission: AssignmentSubmission | null;
    isUploading: boolean;
    error: string | null;
    submit: (blob: Blob, nickname?: string | null) => Promise<void>;
}

const NOT_CONFIGURED = '학급 모드가 구성되지 않았습니다';
const NO_ASSIGNMENT = '과제가 선택되지 않았습니다';

/**
 * Student-side assignment submission lifecycle (insert-only, local-state-only).
 *
 * Anonymous clients cannot read back unapproved submissions or delete any
 * rows (RLS designed in v3-T1, see SUPABASE_SETUP.md). The UX is therefore
 * driven entirely from this hook's local state:
 *
 *  - Mount always starts with submission=null. On page refresh the student
 *    sees the photo-picker again — server re-fetch is impossible by design.
 *  - submit(blob) uploads to Storage and INSERTs a new pending row, storing
 *    the resulting row in local state. Visually replaces any prior preview.
 *  - Re-submits produce additional pending rows; the teacher approves the
 *    latest and ignores/unapproves the others (T5).
 */
export function useStudentSubmission(
    assignmentId: string | null,
    studentToken: string
): UseStudentSubmissionReturn {
    const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = useCallback(
        async (blob: Blob, nickname?: string | null): Promise<void> => {
            if (!isSupabaseConfigured()) throw new Error(NOT_CONFIGURED);
            const supabase = getSupabase();
            if (!supabase) throw new Error(NOT_CONFIGURED);
            if (!assignmentId) throw new Error(NO_ASSIGNMENT);

            setIsUploading(true);
            setError(null);
            try {
                const { publicUrl } = await uploadSubmission(
                    assignmentId,
                    studentToken,
                    blob
                );

                const cleanNickname =
                    nickname && nickname.trim().length > 0 ? nickname.trim().slice(0, 20) : null;

                const { data, error: insertErr } = await supabase
                    .from('assignment_submissions')
                    .insert({
                        assignment_id: assignmentId,
                        student_token: studentToken,
                        nickname: cleanNickname,
                        image_url: publicUrl,
                        approved: false,
                    })
                    .select()
                    .single();

                if (insertErr) throw new Error(insertErr.message);
                setSubmission(data as AssignmentSubmission);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                throw err;
            } finally {
                setIsUploading(false);
            }
        },
        [assignmentId, studentToken]
    );

    return {
        submission,
        isUploading,
        error,
        submit,
    };
}
