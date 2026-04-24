import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabaseClient';
import { generateSessionCode } from '../lib/sessionCode';
import type {
    ClassroomSession,
    SessionVote,
    VoteOptions,
    VoteAggregation,
} from '../types/classroom';

interface UseClassroomSessionReturn {
    session: ClassroomSession | null;
    votes: SessionVote[];
    aggregation: VoteAggregation;
    isCreating: boolean;
    error: string | null;
    createSession: (
        presetId: string,
        voteOptions: VoteOptions,
        teacherId: string | null
    ) => Promise<ClassroomSession>;
    updateVoteOptions: (sessionId: string, voteOptions: VoteOptions) => Promise<void>;
    closeSession: (sessionId: string) => Promise<void>;
    reopenSession: (sessionId: string) => Promise<void>;
    setFinalImage: (
        sessionId: string,
        finalPrompt: string,
        finalImageUrl: string
    ) => Promise<void>;
    clearSession: () => void;
}

const MISCONFIGURED_ERROR = 'Supabase is not configured. Complete SUPABASE_SETUP.md first.';

/**
 * Aggregate a list of SessionVote rows into a VoteAggregation (keyword /
 * palette / detail frequency tables, sorted descending by count).
 * Pure — safe to call with any array, including empty.
 */
export function aggregateVotes(votes: SessionVote[]): VoteAggregation {
    const tally = (pick: (v: SessionVote) => string | null) => {
        const counts = new Map<string, number>();
        for (const v of votes) {
            const value = pick(v);
            if (!value) continue;
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
    };

    return {
        keywords: tally((v) => v.vote_keyword),
        palettes: tally((v) => v.vote_palette),
        details: tally((v) => v.vote_detail),
        total: votes.length,
    };
}

export function useClassroomSession(): UseClassroomSessionReturn {
    const [session, setSession] = useState<ClassroomSession | null>(null);
    const [votes, setVotes] = useState<SessionVote[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const aggregation = useMemo(() => aggregateVotes(votes), [votes]);

    // Manage realtime subscription lifecycle.
    useEffect(() => {
        const supabase = getSupabase();
        if (!supabase || !session) return;
        const sessionId = session.id;
        let cancelled = false;

        // Load any existing votes first (covers late subscribers).
        // Merge-by-id so Realtime INSERTs arriving before preload resolves
        // are not overwritten by the server snapshot.
        supabase
            .from('session_votes')
            .select('*')
            .eq('session_id', sessionId)
            .then(
                ({ data, error: loadError }) => {
                    if (cancelled) return;
                    if (loadError) {
                        setError(loadError.message || '투표 초기 로드 실패');
                        return;
                    }
                    if (Array.isArray(data)) {
                        setVotes((prev) => {
                            const seen = new Set(prev.map((v) => v.id));
                            const merged = [...prev];
                            for (const row of data as SessionVote[]) {
                                if (!seen.has(row.id)) merged.push(row);
                            }
                            return merged;
                        });
                    }
                },
                (err: unknown) => {
                    if (cancelled) return;
                    const msg = err instanceof Error ? err.message : String(err);
                    setError(msg || '투표 초기 로드 실패');
                }
            );

        const channel = supabase
            .channel(`session-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_votes',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    const newVote = payload.new as SessionVote;
                    setVotes((prev) => {
                        if (prev.some((v) => v.id === newVote.id)) return prev;
                        return [...prev, newVote];
                    });
                }
            )
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
                    setSession((prev) => (prev ? { ...prev, ...updated } : prev));
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
    }, [session?.id]);

    const createSession = useCallback(
        async (
            presetId: string,
            voteOptions: VoteOptions,
            teacherId: string | null
        ): Promise<ClassroomSession> => {
            const supabase = getSupabase();
            if (!supabase) throw new Error(MISCONFIGURED_ERROR);

            setIsCreating(true);
            setError(null);
            try {
                // Generate a session code; retry on the (extremely unlikely)
                // collision. 32^6 = ~1B combinations so this rarely trips.
                let lastError: unknown = null;
                for (let attempt = 0; attempt < 5; attempt++) {
                    const code = generateSessionCode();
                    const expiresAt = new Date(
                        Date.now() + 6 * 60 * 60 * 1000 // 6h default TTL
                    ).toISOString();

                    const { data, error: insertError } = await supabase
                        .from('classroom_sessions')
                        .insert({
                            code,
                            teacher_id: teacherId,
                            preset_id: presetId,
                            status: 'voting',
                            vote_options: voteOptions,
                            expires_at: expiresAt,
                        })
                        .select()
                        .single();

                    if (!insertError && data) {
                        const created = data as ClassroomSession;
                        setSession(created);
                        setVotes([]);
                        return created;
                    }
                    lastError = insertError;
                    // 23505 = unique_violation — retry with a fresh code.
                    if (insertError && (insertError as { code?: string }).code !== '23505') {
                        break;
                    }
                }
                throw lastError ?? new Error('Failed to create session.');
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                throw err;
            } finally {
                setIsCreating(false);
            }
        },
        []
    );

    const updateVoteOptions = useCallback(
        async (sessionId: string, voteOptions: VoteOptions) => {
            const supabase = getSupabase();
            if (!supabase) throw new Error(MISCONFIGURED_ERROR);
            const { data, error: updateError } = await supabase
                .from('classroom_sessions')
                .update({ vote_options: voteOptions })
                .eq('id', sessionId)
                .select()
                .single();
            if (updateError) throw updateError;
            if (data) setSession(data as ClassroomSession);
        },
        []
    );

    const closeSession = useCallback(async (sessionId: string) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error(MISCONFIGURED_ERROR);
        const { data, error: updateError } = await supabase
            .from('classroom_sessions')
            .update({ status: 'generating' })
            .eq('id', sessionId)
            .select()
            .single();
        if (updateError) throw updateError;
        if (data) setSession(data as ClassroomSession);
    }, []);

    // Rollback helper: used when image generation fails after closeSession()
    // so the session returns to 'voting' instead of getting stuck in
    // 'generating' forever.
    const reopenSession = useCallback(async (sessionId: string) => {
        const supabase = getSupabase();
        if (!supabase) throw new Error(MISCONFIGURED_ERROR);
        const { data, error: updateError } = await supabase
            .from('classroom_sessions')
            .update({ status: 'voting' })
            .eq('id', sessionId)
            .select()
            .single();
        if (updateError) throw updateError;
        if (data) setSession(data as ClassroomSession);
    }, []);

    const setFinalImage = useCallback(
        async (sessionId: string, finalPrompt: string, finalImageUrl: string) => {
            const supabase = getSupabase();
            if (!supabase) throw new Error(MISCONFIGURED_ERROR);
            const { data, error: updateError } = await supabase
                .from('classroom_sessions')
                .update({
                    status: 'complete',
                    final_prompt: finalPrompt,
                    final_image_url: finalImageUrl,
                })
                .eq('id', sessionId)
                .select()
                .single();
            if (updateError) throw updateError;
            if (data) setSession(data as ClassroomSession);
        },
        []
    );

    const clearSession = useCallback(() => {
        setSession(null);
        setVotes([]);
        setError(null);
    }, []);

    return {
        session,
        votes,
        aggregation,
        isCreating,
        error,
        createSession,
        updateVoteOptions,
        closeSession,
        reopenSession,
        setFinalImage,
        clearSession,
    };
}
