import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { generateClassroomCode } from '../utils/classroomCode';
import type { Classroom } from '../types/classroom';

export interface UseClassroomReturn {
    classroom: Classroom | null;
    isLoading: boolean;
    error: string | null;
    create: (name: string) => Promise<Classroom>;
    rename: (newName: string) => Promise<void>;
    reload: () => void;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';
const MAX_NAME_LENGTH = 50;
const CODE_RETRY_LIMIT = 3;

/**
 * 1-teacher-1-classroom MVP. Loads the single classroom owned by the current
 * authenticated teacher. Provides create/rename helpers.
 *
 * When Supabase is not configured, returns a safe no-op state so the UI can
 * still render the explanatory screen via TeacherAuthGate.
 */
export function useClassroom(): UseClassroomReturn {
    const configured = isSupabaseConfigured();
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(configured);
    const [error, setError] = useState<string | null>(null);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
        if (!configured) return;
        const supabase = getSupabase();
        if (!supabase) return;

        let cancelled = false;

        (async () => {
            const { data: userData, error: userErr } = await supabase.auth.getUser();
            if (cancelled) return;
            if (userErr || !userData.user) {
                // Not authenticated — TeacherAuthGate handles the UI; we just stay null.
                setClassroom(null);
                setIsLoading(false);
                return;
            }
            const { data, error: selErr } = await supabase
                .from('classrooms')
                .select('*')
                .eq('teacher_id', userData.user.id)
                .maybeSingle();
            if (cancelled) return;
            if (selErr) {
                setError(selErr.message);
                setClassroom(null);
            } else {
                setClassroom((data as Classroom | null) ?? null);
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
    }, [configured, reloadTick]);

    const reload = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setReloadTick((t) => t + 1);
    }, []);

    const create = useCallback(async (rawName: string): Promise<Classroom> => {
        if (!configured) {
            throw new Error('Supabase is not configured.');
        }
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client unavailable.');

        const name = rawName.trim().slice(0, MAX_NAME_LENGTH);
        if (!name) throw new Error('학급 이름을 입력해 주세요.');

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
            throw new Error('로그인 정보가 없습니다.');
        }
        const teacherId = userData.user.id;

        // Try insert with a fresh code; retry on code-uniqueness collision.
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt++) {
            const code = generateClassroomCode();
            const { data, error: insErr } = await supabase
                .from('classrooms')
                .insert({ teacher_id: teacherId, name, code })
                .select('*')
                .single();

            if (!insErr && data) {
                const created = data as Classroom;
                setClassroom(created);
                setError(null);
                return created;
            }

            lastErr = insErr;
            if (insErr?.code === POSTGRES_UNIQUE_VIOLATION) {
                // Could be teacher_id duplicate (already has a classroom) or
                // code collision. Re-fetch the teacher's row first; if it
                // exists, this is the teacher_id case → return existing.
                const { data: existing } = await supabase
                    .from('classrooms')
                    .select('*')
                    .eq('teacher_id', teacherId)
                    .maybeSingle();
                if (existing) {
                    const c = existing as Classroom;
                    setClassroom(c);
                    setError(null);
                    return c;
                }
                // Otherwise it was a code collision — loop and retry with new code.
                continue;
            }
            // Non-unique error; bail out.
            break;
        }
        const msg = lastErr instanceof Error
            ? lastErr.message
            : (typeof lastErr === 'object' && lastErr && 'message' in lastErr
                ? String((lastErr as { message: unknown }).message)
                : '학급 생성에 실패했습니다.');
        setError(msg);
        throw new Error(msg);
    }, [configured]);

    const rename = useCallback(async (rawName: string): Promise<void> => {
        if (!configured) throw new Error('Supabase is not configured.');
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase client unavailable.');
        if (!classroom) throw new Error('학급이 없습니다.');

        const newName = rawName.trim().slice(0, MAX_NAME_LENGTH);
        if (!newName) throw new Error('학급 이름을 입력해 주세요.');
        if (newName === classroom.name) return;

        const { data, error: updErr } = await supabase
            .from('classrooms')
            .update({ name: newName })
            .eq('id', classroom.id)
            .select('*')
            .single();

        if (updErr) {
            setError(updErr.message);
            throw new Error(updErr.message);
        }
        setClassroom((data as Classroom) ?? classroom);
        setError(null);
    }, [classroom, configured]);

    if (!configured) {
        // Stable no-op shape. Calls to create/rename will reject with a clear
        // error message; callers should generally avoid invoking them.
        return {
            classroom: null,
            isLoading: false,
            error: null,
            create,
            rename,
            reload,
        };
    }

    return { classroom, isLoading, error, create, rename, reload };
}
