/**
 * Per-session student token management.
 *
 * Each session code maps to its own localStorage key so a device that has
 * participated in multiple classes does not accidentally share identities
 * across rooms. The unique(session_id, student_token) constraint on
 * `session_votes` (Task 4 schema) lets a refreshing student land back on
 * their existing submission instead of duplicating rows.
 */

const KEY_PREFIX = 'artclass.student.token.';

function storageAvailable(): boolean {
    try {
        return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
        return false;
    }
}

function randomToken(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: 16 random bytes -> hex
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Returns a stable UUID-ish token for this (device, sessionCode) pair.
 * Creates and persists on first call; reuses afterwards.
 */
export function getStudentToken(sessionCode: string): string {
    const key = `${KEY_PREFIX}${sessionCode}`;
    if (!storageAvailable()) {
        // Without localStorage every call would mint a new token. That's
        // still functionally correct — the student just loses the "refresh
        // and see my submission" perk. Memoize in-module for the session
        // lifetime at least.
        if (!inMemoryTokens.has(key)) inMemoryTokens.set(key, randomToken());
        return inMemoryTokens.get(key)!;
    }
    try {
        const existing = window.localStorage.getItem(key);
        if (existing && existing.length > 0) return existing;
        const created = randomToken();
        window.localStorage.setItem(key, created);
        return created;
    } catch {
        if (!inMemoryTokens.has(key)) inMemoryTokens.set(key, randomToken());
        return inMemoryTokens.get(key)!;
    }
}

/**
 * Remove the stored token for a specific session (e.g. after "다시 참여하기").
 */
export function clearStudentToken(sessionCode: string): void {
    const key = `${KEY_PREFIX}${sessionCode}`;
    inMemoryTokens.delete(key);
    if (!storageAvailable()) return;
    try {
        window.localStorage.removeItem(key);
    } catch {
        // best-effort
    }
}

const inMemoryTokens = new Map<string, string>();
