/**
 * Shared helper utilities
 */

export function cleanWalmartUrl(url: string | null | undefined): string | null | undefined {
    if (!url || typeof url !== 'string') return url;
    try {
        const parsed = new URL(url);
        return parsed.origin + parsed.pathname;
    } catch {
        return url;
    }
}

export function findLastJson(text: string | null | undefined): unknown | null {
    if (!text || typeof text !== 'string') return null;
    const lines = text.split('\n').reverse();
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                return JSON.parse(trimmed);
            } catch {
                continue;
            }
        }
    }
    return null;
}

export function findLastData(text: string | null | undefined): unknown | null {
    const json = findLastJson(text);
    if (json && typeof json === 'object' && json !== null && 'data' in json) {
        return (json as { data: unknown }).data;
    }
    return json;
}
