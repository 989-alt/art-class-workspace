import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getStudentToken } from '../lib/studentToken';
import type { ClassroomSession } from '../types/classroom';

export interface StudentVoteSubmission {
    vote_keyword: string;
    vote_palette: string;
    vote_detail: string;
    nickname?: string | null;
}

export interface UseStudentSessionReturn {
    session: ClassroomSession | null;
    status: ClassroomSession['status'] | 'loading' | 'missing';
    studentToken: string;
    loadError: string | null;
    isSubmitting: boolean;
    hasSubmitted: boolean;
    submitVote: (vote: StudentVoteSubmission) => Promise<void>;
    reload: () => void;
}

const NOT_CONFIGURED = '학급 모드가 구성되지 않았습니다'; // 학급 모드가 구성되지 않았습니다
const NOT_FOUND = '세션을 찾을 수 없습니다'; // 세션을 찾을 수 없습니다
const LOAD_FAIL = '세션 정보를 불러오지 못했습니다'; // 세션 정보를 불러오지 못했습니다

/**
 * Hook that owns the student-side lifecycle for a classroom session:
 * - Loads the session by `code`
 * - Subscribes to realtime UPDATEs so status / final_image_url push live
 * - Exposes `submitVote()` that upserts via (session_id, student_token)
 */
export function useStudentSession(sessionCode: string): UseStudentSessionReturn {
    const [session, setSession] = useState<ClassroomSession | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [loading, setLoading] = useState(true);
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Token stays stable across re-renders for this sessionCode.
    const tokenRef = useRef<string>('');
    if (!tokenRef.current) {
        tokenRef.current = getStudentToken(sessionCode);
    }

    // Load session by code + check existing submission.
    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoadError(NOT_CONFIGURED);
            setLoading(false);
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            setLoadError(NOT_CONFIGURED);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        (async () => {
            try {
                const { data, error } = await supabase
                    .from('classroom_sessions')
                    .select('*')
                    .eq('code', sessionCode)
                    .maybeSingle();
                if (cancelled) return;
                if (error) {
                    setLoadError(error.message || LOAD_FAIL);
                    setSession(null);
                    return;
                }
                if (!data) {
                    setLoadError(NOT_FOUND);
                    setSession(null);
                    return;
                }
                setSession(data as ClassroomSession);

                // Check if this student has already submitted
                const { data: existingVote } = await supabase
                    .from('session_votes')
                    .select('id')
                    .eq('session_id', (data as ClassroomSession).id)
                    .eq('student_token', tokenRef.current)
                    .maybeSingle();
                if (cancelled) return;
                if (existingVote) setHasSubmitted(true);
            } catch (err) {
                if (cancelled) return;
                const msg = err instanceof Error ? err.message : String(err);
                setLoadError(msg || LOAD_FAIL);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [sessionCode, reloadCounter]);

    // Subscribe to realtime UPDATEs on the session row.
    useEffect(() => {
        const supabase = getSupabase();
        if (!supabase || !session) return;
        const sessionId = session.id;

        const channel = supabase
            .channel(`student-session-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'classroom_sessions',
                    filter: `id=eq.${sessionId}`,
                },
                (payload) => {
                    const updated = payload.new as ClassroomSession;
                    setSession((prev) => (prev ? { ...prev, ...updated } : updated));
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [session?.id]);

    const submitVote = useCallback(
        async (vote: StudentVoteSubmission) => {
            const supabase = getSupabase();
            if (!supabase) throw new Error(NOT_CONFIGURED);
            if (!session) throw new Error(NOT_FOUND);

            setIsSubmitting(true);
            try {
                const payload = {
                    session_id: session.id,
                    student_token: tokenRef.current,
                    nickname: vote.nickname ?? null,
                    vote_keyword: vote.vote_keyword,
                    vote_palette: vote.vote_palette,
                    vote_detail: vote.vote_detail,
                };

                // Try INSERT first; on unique violation (23505), switch to UPDATE.
                const { error: insertError } = await supabase
                    .from('session_votes')
                    .insert(payload);

                if (insertError && (insertError as { code?: string }).code === '23505') {
                    const { error: updateError } = await supabase
                        .from('session_votes')
                        .update({
                            nickname: payload.nickname,
                            vote_keyword: payload.vote_keyword,
                            vote_palette: payload.vote_palette,
                            vote_detail: payload.vote_detail,
                            submitted_at: new Date().toISOString(),
                        })
                        .eq('session_id', session.id)
                        .eq('student_token', tokenRef.current);
                    if (updateError) throw updateError;
                } else if (insertError) {
                    throw insertError;
                }

                setHasSubmitted(true);
            } finally {
                setIsSubmitting(false);
            }
        },
        [session]
    );

    const reload = useCallback(() => {
        setReloadCounter((n) => n + 1);
    }, []);

    // Derive a single `status` value that covers the initial load + missing cases.
    let status: UseStudentSessionReturn['status'];
    if (loading) status = 'loading';
    else if (!session) status = 'missing';
    else status = session.status;

    return {
        session,
        status,
        studentToken: tokenRef.current,
        loadError,
        isSubmitting,
        hasSubmitted,
        submitVote,
        reload,
    };
}
