import { isFeatureEnabled } from '@/config/features';

export type AnimatedBgMode = 'off' | 'calm' | 'full';

/**
 * Checks whether WebGL rendering context is supported in the current environment.
 */
function isWebGLAvailable(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
    }
    try {
        const canvas = document.createElement('canvas');
        const gl = window.WebGLRenderingContext
            ? ((canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null)
            : null;
        // Release the probe context straight away; browsers cap live WebGL contexts per page.
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return Boolean(gl);
    } catch {
        return false;
    }
}

/**
 * Resolves whether the animated background pilot should run on /journey
 * and which mode ('off' | 'calm' | 'full') should be used.
 */
export function getAnimatedBackgroundMode(): AnimatedBgMode {
    if (typeof window === 'undefined') {
        return 'off';
    }

    // 1. Environment & Feature flag switch (checked first, so production never probes WebGL)
    const isDev = Boolean(import.meta.env.DEV);
    const env = import.meta.env.VITE_ENV;
    const isDevOrStaging = isDev || env === 'development' || env === 'staging';
    const enabled = isDevOrStaging || isFeatureEnabled('animatedBackground');
    if (!enabled) {
        return 'off';
    }

    // 2. Accessibility & Network Data-Saver fallbacks
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        return 'off';
    }

    interface NavigatorWithConnection extends Navigator {
        connection?: {
            saveData?: boolean;
        };
    }
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection?.saveData === true) {
        return 'off';
    }

    // 3. WebGL support check
    if (!isWebGLAvailable()) {
        return 'off';
    }

    // 4. Query param override ?bg=off|calm|full (evaluated only when VITE_ENV !== 'production')
    if (env !== 'production') {
        try {
            const params = new URLSearchParams(window.location.search);
            const bg = params.get('bg');
            if (bg === 'off') return 'off';
            if (bg === 'calm') return 'calm';
            if (bg === 'full') return 'full';
        } catch {
            // Ignore URL parsing errors
        }
    }

    return 'full';
}
