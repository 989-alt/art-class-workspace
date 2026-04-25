import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Assignment, AssignmentSubmission } from '../types/classroom';

export interface ClassGalleryItem {
    submission: AssignmentSubmission;
    assignmentTitle: string;
}

export interface UseClassGalleryReturn {
    items: ClassGalleryItem[];
    isLoading: boolean;
    error: string | null;
    reload: () => void;
}

/**
 * v3 class gallery hook — keyed by `classroom_id`. Aggregates all approved
 * submissions across every assignment in the classroom and decorates each
 * with its parent assignment title for the catalog/grid captions.
 *
 * Strategy (option A from the plan):
 *   1. fetch assignments where classroom_id = ?  (id + title)
 *   2. fetch assignment_submissions where assignment_id IN (ids) and
 *      approved = true
 *   3. join locally
 *
 * Realtime: subscribes to assignment_submissions (cannot easily filter by
 * classroom_id directly since the FK is on assignment_id) and reconciles
 * against the local assignment-id set so cross-classroom rows are dropped.
 */
export function useClassGallery(classroomId: string | null): UseClassGalleryReturn {
    const [items, setItems] = useState<ClassGalleryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadCounter, setReloadCounter] = useState(0);
    const channelRef = useRef<RealtimeChannel | null>(null);
    // Map of assignment_id → title for realtime joiner.
    const assignmentTitleMapRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        if (!isSupabaseConfigured() || !classroomId) {
            queueMicrotask(() => {
                setItems([]);
                setIsLoading(false);
                setError(null);
            });
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            queueMicrotask(() => {
                setItems([]);
                setIsLoading(false);
            });
            return;
        }

        let cancelled = false;
        queueMicrotask(() => {
            setIsLoading(true);
            setError(null);
        });

        (async () => {
            // 1. assignments for this classroom
            const { data: assignments, error: aErr } = await supabase
                .from('assignments')
                .select('id, title, classroom_id, image_url, prompt, created_at')
                .eq('classroom_id', classroomId);

            if (cancelled) return;
            if (aErr) {
                setError(aErr.message || '과제 목록을 불러오지 못했습니다');
                setItems([]);
                setIsLoading(false);
                return;
            }

            const titleMap = new Map<string, string>();
            for (const a of (assignments as Assignment[] | null) ?? []) {
                titleMap.set(a.id, a.title);
            }
            assignmentTitleMapRef.current = titleMap;

            const ids = Array.from(titleMap.keys());
            if (ids.length === 0) {
                setItems([]);
                setIsLoading(false);
                return;
            }

            // 2. approved submissions across those assignments
            const { data: subs, error: sErr } = await supabase
                .from('assignment_submissions')
                .select('*')
                .in('assignment_id', ids)
                .eq('approved', true)
                .order('created_at', { ascending: true });

            if (cancelled) return;
            if (sErr) {
                setError(sErr.message || '갤러리를 불러오지 못했습니다');
                setItems([]);
                setIsLoading(false);
                return;
            }

            const joined: ClassGalleryItem[] = ((subs as AssignmentSubmission[] | null) ?? []).map(
                (s) => ({
                    submission: s,
                    assignmentTitle: titleMap.get(s.assignment_id) ?? '',
                })
            );
            setItems(joined);
            setIsLoading(false);
        })().catch((err: unknown) => {
            if (cancelled) return;
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
            setIsLoading(false);
        });

        // Realtime: subscribe to all submission changes and filter by the
        // assignment-id set we built above. Cross-classroom rows are
        // discarded by the title-map lookup.
        const channel = supabase
            .channel(`class-gallery-${classroomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'assignment_submissions',
                },
                (payload) => {
                    const row = payload.new as AssignmentSubmission;
                    if (!row.approved) return;
                    const title = assignmentTitleMapRef.current.get(row.assignment_id);
                    if (title === undefined) return;
                    setItems((prev) => {
                        if (prev.some((it) => it.submission.id === row.id)) return prev;
                        const next = [
                            ...prev,
                            { submission: row, assignmentTitle: title },
                        ];
                        next.sort(
                            (a, b) =>
                                new Date(a.submission.created_at).getTime() -
                                new Date(b.submission.created_at).getTime()
                        );
                        return next;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'assignment_submissions',
                },
                (payload) => {
                    const row = payload.new as AssignmentSubmission;
                    const title = assignmentTitleMapRef.current.get(row.assignment_id);
                    if (title === undefined) return;
                    setItems((prev) => {
                        const exists = prev.some((it) => it.submission.id === row.id);
                        if (row.approved) {
                            if (exists) {
                                return prev.map((it) =>
                                    it.submission.id === row.id
                                        ? { submission: row, assignmentTitle: title }
                                        : it
                                );
                            }
                            const next = [
                                ...prev,
                                { submission: row, assignmentTitle: title },
                            ];
                            next.sort(
                                (a, b) =>
                                    new Date(a.submission.created_at).getTime() -
                                    new Date(b.submission.created_at).getTime()
                            );
                            return next;
                        }
                        return exists
                            ? prev.filter((it) => it.submission.id !== row.id)
                            : prev;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'assignment_submissions',
                },
                (payload) => {
                    const old = payload.old as { id?: string };
                    if (!old.id) return;
                    setItems((prev) =>
                        prev.filter((it) => it.submission.id !== old.id)
                    );
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
    }, [classroomId, reloadCounter]);

    const reload = useCallback(() => {
        setReloadCounter((n) => n + 1);
    }, []);

    return { items, isLoading, error, reload };
}
