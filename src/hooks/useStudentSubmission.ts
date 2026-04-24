import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SessionSubmission } from '../types/classroom';
import {
    removeStorageObject,
    storagePathFromPublicUrl,
    uploadSubmission,
} from '../lib/imageUpload';

export interface UseStudentSubmissionReturn {
    submission: SessionSubmission | null;
    isLoading: boolean;
    isUploading: boolean;
    error: string | null;
    submit: (blob: Blob, nickname?: string | null) => Promise<void>;
    remove: () => Promise<void>;
    reload: () => void;
}

const NOT_CONFIGURED = '학급 모드가 구성되지 않았습니다';

/**
 * Student-side submission lifecycle:
 * - On mount, queries session_submissions for (session_id, student_token)
 * - `submit` uploads image to Storage and inserts a new row (approved=false).
 *   If a pending submission already exists, it is replaced atomically:
 *   old row+object deleted first, then new one inserted. If the old row is
 *   already approved, the re-submission is blocked (teacher must unapprove).
 * - `remove` deletes the student's pending row + Storage object.
 *
 * Uniqueness note: the schema has no unique(session_id, student_token) on
 * session_submissions by design (Task 7 spec). The hook enforces "one row
 * per student" client-side instead.
 */
export function useStudentSubmission(
    sessionId: string | null | undefined,
    studentToken: string
): UseStudentSubmissionReturn {
    const [submission, setSubmission] = useState<SessionSubmission | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);

    // Latest-mount guard: bail on stale async writes.
    const mountIdRef = useRef(0);

    useEffect(() => {
        mountIdRef.current += 1;
        const mountId = mountIdRef.current;

        if (!isSupabaseConfigured() || !sessionId || !studentToken) {
            setSubmission(null);
            setIsLoading(false);
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            setSubmission(null);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        (async () => {
            try {
                const { data, error: loadErr } = await supabase
                    .from('session_submissions')
                    .select('*')
                    .eq('session_id', sessionId)
                    .eq('student_token', studentToken)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (cancelled || mountIdRef.current !== mountId) return;
                if (loadErr) {
                    setError(loadErr.message || '제출 내역을 불러오지 못했습니다');
                    setSubmission(null);
                } else {
                    setSubmission((data as SessionSubmission) ?? null);
                }
            } catch (err) {
                if (cancelled || mountIdRef.current !== mountId) return;
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
            } finally {
                if (!cancelled && mountIdRef.current === mountId) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionId, studentToken, reloadCounter]);

    const remove = useCallback(async (): Promise<void> => {
        const supabase = getSupabase();
        if (!supabase) throw new Error(NOT_CONFIGURED);
        if (!submission) return;
        if (submission.approved) {
            throw new Error('승인된 작품은 학생이 삭제할 수 없습니다.');
        }
        const { error: delErr } = await supabase
            .from('session_submissions')
            .delete()
            .eq('id', submission.id);
        if (delErr) throw new Error(delErr.message);

        // Best-effort Storage object cleanup.
        const path = storagePathFromPublicUrl(submission.image_url);
        if (path) await removeStorageObject(path);

        setSubmission(null);
    }, [submission]);

    const submit = useCallback(
        async (blob: Blob, nickname?: string | null): Promise<void> => {
            if (!isSupabaseConfigured()) throw new Error(NOT_CONFIGURED);
            const supabase = getSupabase();
            if (!supabase) throw new Error(NOT_CONFIGURED);
            if (!sessionId) throw new Error('세션이 없습니다');

            setIsUploading(true);
            setError(null);
            try {
                // If student already has a pending submission, replace it.
                if (submission) {
                    if (submission.approved) {
                        throw new Error('이미 승인된 작품이 있어 다시 제출할 수 없습니다.');
                    }
                    try {
                        await remove();
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err);
                        throw new Error(msg || '기존 제출 삭제에 실패했습니다');
                    }
                }

                const { publicUrl } = await uploadSubmission(sessionId, studentToken, blob);

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
        [sessionId, studentToken, submission, remove]
    );

    const reload = useCallback(() => {
        setReloadCounter((n) => n + 1);
    }, []);

    return {
        submission,
        isLoading,
        isUploading,
        error,
        submit,
        remove,
        reload,
    };
}
