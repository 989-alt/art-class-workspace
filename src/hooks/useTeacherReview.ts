import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SessionSubmission } from '../types/classroom';

export interface UseTeacherReviewReturn {
    submissions: SessionSubmission[];
    approvedCount: number;
    pendingCount: number;
    isLoading: boolean;
    error: string | null;
    approve: (id: string) => Promise<void>;
    unapprove: (id: string) => Promise<void>;
    reload: () => void;
}

/**
 * Teacher-side submission review:
 * - Initial fetch of all rows for the session.
 * - Realtime INSERT + UPDATE + DELETE subscription on session_submissions
 *   filtered by session_id so new student uploads appear live.
 * - approve/unapprove toggle the `approved` boolean.
 */
export function useTeacherReview(sessionId: string | null | undefined): UseTeacherReviewReturn {
    const [submissions, setSubmissions] = useState<SessionSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured() || !sessionId) {
            setSubmissions([]);
            setIsLoading(false);
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            setSubmissions([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        // Initial load.
        supabase
            .from('session_submissions')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .then(
                ({ data, error: loadErr }) => {
                    if (cancelled) return;
                    if (loadErr) {
                        setError(loadErr.message || '제출 목록을 불러오지 못했습니다');
                        setSubmissions([]);
                    } else if (Array.isArray(data)) {
                        setSubmissions((prev) => {
                            // Merge with anything that arrived via Realtime
                            // between the fetch start and completion.
                            const seen = new Set(prev.map((r) => r.id));
                            const merged = [...prev];
                            for (const row of data as SessionSubmission[]) {
                                if (!seen.has(row.id)) merged.push(row);
                            }
                            merged.sort(
                                (a, b) =>
                                    new Date(a.created_at).getTime() -
                                    new Date(b.created_at).getTime()
                            );
                            return merged;
                        });
                    }
                    setIsLoading(false);
                },
                (err: unknown) => {
                    if (cancelled) return;
                    const msg = err instanceof Error ? err.message : String(err);
                    setError(msg);
                    setIsLoading(false);
                }
            );

        const channel = supabase
            .channel(`teacher-review-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_submissions',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const row = payload.new as SessionSubmission;
                    setSubmissions((prev) => {
                        if (prev.some((r) => r.id === row.id)) return prev;
                        return [...prev, row];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'session_submissions',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const row = payload.new as SessionSubmission;
                    setSubmissions((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, ...row } : r))
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'session_submissions',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const old = payload.old as { id?: string };
                    if (!old.id) return;
                    setSubmissions((prev) => prev.filter((r) => r.id !== old.id));
                }
            )
            .subscribe();
        channelRef.current = channel;

        return () => {
            cancelled = true;
            channel.unsubscribe();
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [sessionId, reloadCounter]);

    const approve = useCallback(
        async (id: string): Promise<void> => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not configured');
            const { error: updErr } = await supabase
                .from('session_submissions')
                .update({ approved: true })
                .eq('id', id);
            if (updErr) throw new Error(updErr.message);
            // Optimistic local update (realtime UPDATE will also arrive).
            setSubmissions((prev) =>
                prev.map((r) => (r.id === id ? { ...r, approved: true } : r))
            );
        },
        []
    );

    const unapprove = useCallback(
        async (id: string): Promise<void> => {
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase not configured');
            const { error: updErr } = await supabase
                .from('session_submissions')
                .update({ approved: false })
                .eq('id', id);
            if (updErr) throw new Error(updErr.message);
            setSubmissions((prev) =>
                prev.map((r) => (r.id === id ? { ...r, approved: false } : r))
            );
        },
        []
    );

    const reload = useCallback(() => {
        setReloadCounter((n) => n + 1);
    }, []);

    const { approvedCount, pendingCount } = useMemo(() => {
        let a = 0;
        let p = 0;
        for (const s of submissions) {
            if (s.approved) a++;
            else p++;
        }
        return { approvedCount: a, pendingCount: p };
    }, [submissions]);

    return {
        submissions,
        approvedCount,
        pendingCount,
        isLoading,
        error,
        approve,
        unapprove,
        reload,
    };
}
