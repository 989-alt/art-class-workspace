import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Assignment } from '../types/classroom';

export interface CreateAssignmentInput {
    title: string;
    image_url: string;
    prompt?: string | null;
}

export interface UseAssignmentsReturn {
    assignments: Assignment[];
    isLoading: boolean;
    error: string | null;
    create: (input: CreateAssignmentInput) => Promise<Assignment>;
    remove: (id: string) => Promise<void>;
    reload: () => void;
}

/**
 * Loads + manages the assignment list for a single classroom. Pass `null` to
 * disable (returns empty list, all mutations no-op-throw).
 *
 * Realtime subscriptions intentionally omitted for the MVP — T5 will revisit
 * once the teacher review flow needs live updates.
 */
export function useAssignments(classroomId: string | null): UseAssignmentsReturn {
    const configured = isSupabaseConfigured();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        if (!configured || !classroomId) {
            // Defer synchronous resets to a microtask so we don't cause a
            // cascading render in the same frame the effect mounts.
            queueMicrotask(() => {
                if (cancelled) return;
                setAssignments([]);
                setIsLoading(false);
                setError(null);
            });
            return () => {
                cancelled = true;
            };
        }

        const supabase = getSupabase();
        if (!supabase) {
            queueMicrotask(() => {
                if (cancelled) return;
                setAssignments([]);
                setIsLoading(false);
            });
            return () => {
                cancelled = true;
            };
        }

        queueMicrotask(() => {
            if (cancelled) return;
            setIsLoading(true);
            setError(null);
        });

        (async () => {
            const { data, error: selErr } = await supabase
                .from('assignments')
                .select('*')
                .eq('classroom_id', classroomId)
                .order('created_at', { ascending: false });

            if (cancelled) return;
            if (selErr) {
                setError(selErr.message);
                setAssignments([]);
            } else {
                setAssignments((data as Assignment[] | null) ?? []);
            }
            setIsLoading(false);
        })().catch((err) => {
            if (cancelled) return;
            setError(err instanceof Error ? err.message : String(err));
            setIsLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [configured, classroomId, reloadTick]);

    const reload = useCallback(() => {
        setReloadTick((t) => t + 1);
    }, []);

    const create = useCallback(
        async (input: CreateAssignmentInput): Promise<Assignment> => {
            if (!configured) throw new Error('Supabase is not configured.');
            if (!classroomId) throw new Error('학급이 없습니다.');
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase client unavailable.');

            const title = input.title.trim().slice(0, 60);
            if (!title) throw new Error('과제 제목을 입력해 주세요.');

            const { data, error: insErr } = await supabase
                .from('assignments')
                .insert({
                    classroom_id: classroomId,
                    title,
                    image_url: input.image_url,
                    prompt: input.prompt ?? null,
                })
                .select('*')
                .single();

            if (insErr || !data) {
                const msg = insErr?.message ?? '과제 생성에 실패했습니다.';
                setError(msg);
                throw new Error(msg);
            }

            const created = data as Assignment;
            setAssignments((prev) => [created, ...prev]);
            setError(null);
            return created;
        },
        [configured, classroomId]
    );

    const remove = useCallback(
        async (id: string): Promise<void> => {
            if (!configured) throw new Error('Supabase is not configured.');
            const supabase = getSupabase();
            if (!supabase) throw new Error('Supabase client unavailable.');

            const { error: delErr } = await supabase
                .from('assignments')
                .delete()
                .eq('id', id);

            if (delErr) {
                setError(delErr.message);
                throw new Error(delErr.message);
            }
            setAssignments((prev) => prev.filter((a) => a.id !== id));
            setError(null);
        },
        [configured]
    );

    return { assignments, isLoading, error, create, remove, reload };
}
