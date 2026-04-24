import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import type { Assignment } from '../types/classroom';

export interface StudentClassroomInfo {
    id: string;
    name: string;
    code: string;
}

export interface UseStudentClassroomReturn {
    classroom: StudentClassroomInfo | null;
    assignments: Assignment[];
    isLoading: boolean;
    error: string | null;
    reload: () => void;
}

const NOT_FOUND_ERROR = '학급을 찾을 수 없습니다';
const NOT_CONFIGURED_ERROR = '학급 모드가 구성되지 않았습니다';

/**
 * Anonymous student-side loader. Resolves a classroom code into the classroom
 * row + its published assignments. RLS allows anon SELECT on both `classrooms`
 * and `assignments`, so no auth is required.
 *
 *  - `code` empty/null → returns the safe empty shape, never queries.
 *  - Classroom miss → `error = "학급을 찾을 수 없습니다"`, assignments stays [].
 *  - Supabase unconfigured → fixed error message; the UI shows guidance.
 */
export function useStudentClassroom(code: string | null): UseStudentClassroomReturn {
    const [classroom, setClassroom] = useState<StudentClassroomInfo | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        if (!code) {
            queueMicrotask(() => {
                if (cancelled) return;
                setClassroom(null);
                setAssignments([]);
                setIsLoading(false);
                setError(null);
            });
            return () => {
                cancelled = true;
            };
        }

        if (!isSupabaseConfigured()) {
            queueMicrotask(() => {
                if (cancelled) return;
                setClassroom(null);
                setAssignments([]);
                setIsLoading(false);
                setError(NOT_CONFIGURED_ERROR);
            });
            return () => {
                cancelled = true;
            };
        }

        const supabase = getSupabase();
        if (!supabase) {
            queueMicrotask(() => {
                if (cancelled) return;
                setClassroom(null);
                setAssignments([]);
                setIsLoading(false);
                setError(NOT_CONFIGURED_ERROR);
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
            const { data: classData, error: classErr } = await supabase
                .from('classrooms')
                .select('id, name, code')
                .eq('code', code)
                .maybeSingle();

            if (cancelled) return;
            if (classErr) {
                setError(classErr.message);
                setClassroom(null);
                setAssignments([]);
                setIsLoading(false);
                return;
            }
            if (!classData) {
                setError(NOT_FOUND_ERROR);
                setClassroom(null);
                setAssignments([]);
                setIsLoading(false);
                return;
            }

            const found: StudentClassroomInfo = {
                id: classData.id as string,
                name: classData.name as string,
                code: classData.code as string,
            };
            setClassroom(found);

            const { data: aData, error: aErr } = await supabase
                .from('assignments')
                .select('*')
                .eq('classroom_id', found.id)
                .order('created_at', { ascending: false });

            if (cancelled) return;
            if (aErr) {
                setError(aErr.message);
                setAssignments([]);
            } else {
                setAssignments((aData as Assignment[] | null) ?? []);
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
    }, [code, reloadTick]);

    const reload = useCallback(() => {
        setReloadTick((t) => t + 1);
    }, []);

    return { classroom, assignments, isLoading, error, reload };
}
