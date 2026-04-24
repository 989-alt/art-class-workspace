import { useEffect, useState, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase, resetSupabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface UseTeacherAuthReturn {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isConfigured: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

/**
 * Wraps Supabase Auth for the teacher. When Supabase is not configured the
 * hook returns a safe no-op state with `isConfigured=false` so callers can
 * render an explanatory screen rather than crash.
 */
export function useTeacherAuth(): UseTeacherAuthReturn {
    const configured = isSupabaseConfigured();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(configured);

    useEffect(() => {
        if (!configured) {
            setIsLoading(false);
            return;
        }
        const supabase = getSupabase();
        if (!supabase) {
            setIsLoading(false);
            return;
        }
        let cancelled = false;

        supabase.auth.getUser().then(({ data }) => {
            if (cancelled) return;
            setUser(data.user ?? null);
            setIsLoading(false);
        }).catch(() => {
            if (cancelled) return;
            setIsLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            cancelled = true;
            listener.subscription.unsubscribe();
        };
    }, [configured]);

    const signIn = useCallback(async (email: string, password: string) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
    }, []);

    const signOut = useCallback(async () => {
        const supabase = getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
        resetSupabase();
    }, []);

    return {
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isConfigured: configured,
        signIn,
        signUp,
        signOut,
    };
}
