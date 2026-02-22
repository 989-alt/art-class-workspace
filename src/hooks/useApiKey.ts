import { getKey } from '../utils/apiKeyManager';

export function useApiKey() {
    const apiKey = getKey();

    return {
        apiKey,
        hasApiKey: !!apiKey,
        isLoaded: true,
    };
}
