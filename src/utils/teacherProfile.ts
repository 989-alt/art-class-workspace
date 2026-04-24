/**
 * Teacher profile storage helpers.
 *
 * The teacher's display name is stored in localStorage under
 * 'artclass.teacherName' and used when composing the copyright
 * certificate page on PDF export. Values may be Korean — callers
 * should not assume ASCII.
 */

const STORAGE_KEY = 'artclass.teacherName';
/**
 * UI-friendly default shown in the teacher-name input placeholder and used
 * as the fallback when storage is empty. The certificate page substitutes
 * an em-dash ("—") when the value equals this default, so a teacher who
 * never customized the name doesn't see Korean tofu on the English-only
 * certificate page. Exported so the certificate boundary can do that
 * substitution without hard-coding the Korean string.
 */
export const DEFAULT_TEACHER_NAME = '교사'; // "교사"

export function getTeacherName(): string {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && raw.trim().length > 0) {
            return raw;
        }
    } catch {
        // localStorage may be unavailable (private mode, SSR shim, etc.)
    }
    return DEFAULT_TEACHER_NAME;
}

export function setTeacherName(name: string): void {
    try {
        const trimmed = name.trim();
        if (trimmed.length === 0) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, trimmed);
        }
    } catch {
        // Swallow — not critical.
    }
}
