import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { SessionSubmission } from '../types/classroom';

export interface UseClassGalleryReturn {
    approved: SessionSubmission[];
    isLoading: boolean;
    error: string | null;
    reload: () => void;
}

/**
 * Gallery-side subscription:
 * - Initial fetch of approved submissions only (RLS allows anon SELECT where
 *   approved = true).
 * - Subscribes to INSERT + UPDATE + DELETE on session_submissions scoped to
 *   the session so newly-approved works appear live, un-approved works are
 *   removed, and deleted rows disappear.
 *
 * Separate from useTeacherReview so the gallery view doesn't have to know
 * about pending rows and doesn't accidentally display them if RLS loosens.
 */
export function useClassGallery(sessionId: string | null | undefined): UseClassGalleryReturn {
    const [approved, setApproved] = useState<SessionSubmission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured() || !sessionId) {
            // Mirror the not-configured state. Parallels useTeacherReview's
            // pattern: these setters are only meaningful when we previously
            // had a session and it was cleared.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setApproved([]);
            setIsLoading(false);
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            setApproved([]);
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        supabase
            .from('session_submissions')
            .select('*')
            .eq('session_id', sessionId)
            .eq('approved', true)
            .order('created_at', { ascending: true })
            .then(
                ({ data, error: loadErr }) => {
                    if (cancelled) return;
                    if (loadErr) {
                        setError(loadErr.message || '갤러리를 불러오지 못했습니다');
                        setApproved([]);
                    } else if (Array.isArray(data)) {
                        setApproved((prev) => {
                            // Merge with anything that arrived via Realtime
                            // while the fetch was in flight.
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
            .channel(`class-gallery-${sessionId}`)
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
                    if (!row.approved) return;
                    setApproved((prev) => {
                        if (prev.some((r) => r.id === row.id)) return prev;
                        return [...prev, row].sort(
                            (a, b) =>
                                new Date(a.created_at).getTime() -
                                new Date(b.created_at).getTime()
                        );
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
                    setApproved((prev) => {
                        const exists = prev.some((r) => r.id === row.id);
                        if (row.approved) {
                            if (exists) {
                                return prev.map((r) => (r.id === row.id ? row : r));
                            }
                            return [...prev, row].sort(
                                (a, b) =>
                                    new Date(a.created_at).getTime() -
                                    new Date(b.created_at).getTime()
                            );
                        }
                        // newly un-approved → drop
                        return exists ? prev.filter((r) => r.id !== row.id) : prev;
                    });
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
                    setApproved((prev) => prev.filter((r) => r.id !== old.id));
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

    const reload = useCallback(() => {
        setReloadCounter((n) => n + 1);
    }, []);

    return { approved, isLoading, error, reload };
}
