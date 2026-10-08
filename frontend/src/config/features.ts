export type FeatureKey = 'signup' | 'monetization' | 'federation' | 'analytics' | 'operations';

/**
 * Feature flag checker.
 *
 * Resolution:
 * 1. If import.meta.env.VITE_FEATURES is defined, parse as comma-separated tokens.
 *    If '*' is present, all features are enabled; otherwise, only explicitly listed keys are enabled.
 * 2. If VITE_FEATURES is undefined and import.meta.env.DEV is true, all features are on.
 * 3. Otherwise (undefined in non-DEV builds, or empty string), all flagged features are off.
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
    const raw = import.meta.env.VITE_FEATURES;

    if (typeof raw !== 'undefined') {
        const tokens = raw.split(',').map((t) => t.trim());
        if (tokens.includes('*')) {
            return true;
        }
        return tokens.includes(key);
    }

    if (import.meta.env.DEV) {
        return true;
    }

    return false;
}

export const useFeature = isFeatureEnabled;
