// 6-character classroom entry code generator and validator.
//
// Alphabet excludes I, O, 0, 1 to avoid handwritten/visual confusion:
//   A-H, J-N, P-Z (24 letters) + 2-9 (8 digits) = 32 characters.
//   32^6 ≈ 1.07B combinations.
//
// Pure module — only depends on the global crypto API when available, with a
// Math.random fallback so SSR / non-browser tooling does not crash.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
// Anchored regex must match the alphabet above exactly.
const CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function getRandomIndex(modulo: number): number {
    // Prefer crypto.getRandomValues; the Math.random fallback is only for
    // exotic environments (e.g. older Node test runners). We don't worry
    // about modulo bias here — 256 % 32 === 0 anyway.
    const cryptoObj: Crypto | undefined =
        typeof globalThis !== 'undefined' &&
        typeof (globalThis as { crypto?: Crypto }).crypto !== 'undefined' &&
        typeof (globalThis as { crypto?: Crypto }).crypto?.getRandomValues === 'function'
            ? (globalThis as { crypto?: Crypto }).crypto
            : undefined;

    if (cryptoObj) {
        const buf = new Uint8Array(1);
        cryptoObj.getRandomValues(buf);
        return buf[0] % modulo;
    }
    return Math.floor(Math.random() * modulo);
}

/**
 * Generate a 6-character classroom entry code from the curated alphabet.
 * Uses crypto.getRandomValues when available; falls back to Math.random.
 */
export function generateClassroomCode(): string {
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
        out += ALPHABET[getRandomIndex(ALPHABET.length)];
    }
    return out;
}

/**
 * Validate that a string is a well-formed classroom code (length and alphabet).
 * Does NOT verify existence in the database.
 */
export function isValidClassroomCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    return CODE_REGEX.test(code);
}
