/**
 * Returns the API key from the environment variable (set in .env file).
 */
export function getKey(): string | null {
    return import.meta.env.VITE_GEMINI_API_KEY || null;
}
