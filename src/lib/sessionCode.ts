// Session code alphabet excludes visually-confusing characters: I, 0, O, 1.
// Result is a 32-character alphabet (safe base-32 style).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/**
 * Generate a 6-character uppercase session code using crypto.getRandomValues.
 * The alphabet is a 32-symbol set that drops the confusing pairs (I/1, O/0).
 * Because the alphabet length is a power of two we can map bytes directly via
 * bit-mask without modulo bias.
 */
export function generateSessionCode(): string {
    const bytes = new Uint8Array(CODE_LENGTH);
    // crypto.getRandomValues is available in all modern browsers and in Vite
    // dev/build environments. Fall back to Math.random in the impossible case
    // of crypto being undefined so unit tests without a DOM can still run.
    const cryptoRef = typeof crypto !== 'undefined' ? crypto : null;
    if (cryptoRef && typeof cryptoRef.getRandomValues === 'function') {
        cryptoRef.getRandomValues(bytes);
    } else {
        for (let i = 0; i < CODE_LENGTH; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        // ALPHABET.length === 32, so `& 31` uniformly selects an index.
        code += ALPHABET[bytes[i] & 31];
    }
    return code;
}

/**
 * Validate a session code: must be exactly 6 uppercase characters drawn from
 * the safe alphabet (no I, O, 0, or 1).
 */
export function isValidSessionCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    if (code.length !== CODE_LENGTH) return false;
    for (const ch of code) {
        if (!ALPHABET.includes(ch)) return false;
    }
    return true;
}

export const SESSION_CODE_ALPHABET = ALPHABET;
export const SESSION_CODE_LENGTH = CODE_LENGTH;
