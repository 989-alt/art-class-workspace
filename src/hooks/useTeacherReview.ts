import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { AssignmentSubmission } from '../types/classroom';

export interface UseTeacherReviewReturn {
    submissions: AssignmentSubmission[];
    approvedCount: number;
    pendingCount: number;
    isLoading: boolean;
    error: string | null;
    approve: (id: string) => Promise<void>;
    unapprove: (id: string) => Promise<void>;
    reload: () => void;
}

/**
 * v3 teacher review hook — keyed by `assignment_id` (NOT v2's `session_id`).
 *
 * Loads the full submission list for a single assignment so the teacher can
 * approve / unapprove individual works.
 *
 * Behavior:
 * - `assignmentId === null` → empty list, no fetch, mutations no-op-throw.
 * - Initial fetch: `select * from assignment_submissions where assignment_id = ?
 *   order by created_at asc`.
 * - Realtime: subscribes to INSERT / UPDATE / DELETE on assignment_submissions
 *   filtered by assignment_id so live student uploads + approval changes flow
 *   in immediately.
 * - approve / unapprove: UPDATE `approved` boolean with optimistic local
 *   state; the realtime UPDATE event will reconcile.
 * - Supabase not configured → no-op (empty list, isLoading=false).
 */
export function useTeacherReview(assignmentId: string | null): UseTeacherReviewReturn {
    const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured() || !assignmentId) {
            queueMicrotask(() => {
                setSubmissions([]);
                setIsLoading(false);
                setError(null);
            });
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            queueMicrotask(() => {
                setSubmissions([]);
                setIsLoading(false);
            });
            return;
        }

        let cancelled = false;
        queueMicrotask(() => {
            setIsLoading(true);
            setError(null);
        });

        supabase
            .from('assignment_submissions')
            .select('*')
            .eq('assignment_id', assignmentId)
            .order('created_at', { ascending: true })
            .then(
                ({ data, error: loadErr }) => {
                    if (cancelled) return;
                    if (loadErr) {
                        setError(loadErr.message || '제출 목록을 불러오지 못했습니다');
                        setSubmissions([]);
                    } else if (Array.isArray(data)) {
                        setSubmissions((prev) => {
                            // Merge with any rows that arrived via Realtime
                            // between the fetch start and completion.
                            const seen = new Set(prev.map((r) => r.id));
                            const merged = [...prev];
                            for (const row of data as AssignmentSubmission[]) {
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
            .channel(`teacher-review-${assignmentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'assignment_submissions',
                    filter: `assignment_id=eq.${assignmentId}`,
                },
                (payload) => {
                    const row = payload.new as AssignmentSubmission;
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
                    table: 'assignment_submissions',
                    filter: `assignment_id=eq.${assignmentId}`,
                },
                (payload) => {
                    const row = payload.new as AssignmentSubmission;
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
                    table: 'assignment_submissions',
                    filter: `assignment_id=eq.${assignmentId}`,
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
    }, [assignmentId, reloadCounter]);

    const approve = useCallback(async (id: string): Promise<void> => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not configured');
        const { error: updErr } = await supabase
            .from('assignment_submissions')
            .update({ approved: true })
            .eq('id', id);
        if (updErr) throw new Error(updErr.message);
        setSubmissions((prev) =>
            prev.map((r) => (r.id === id ? { ...r, approved: true } : r))
        );
    }, []);

    const unapprove = useCallback(async (id: string): Promise<void> => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not configured');
        const { error: updErr } = await supabase
            .from('assignment_submissions')
            .update({ approved: false })
            .eq('id', id);
        if (updErr) throw new Error(updErr.message);
        setSubmissions((prev) =>
            prev.map((r) => (r.id === id ? { ...r, approved: false } : r))
        );
    }, []);

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
