import { isFeatureEnabled } from '@/config/features';

export type AnimatedBgMode = 'off' | 'calm' | 'full';

export type RouteBackgroundType = 'calm' | 'static';

/**
 * Checks whether WebGL rendering context is supported in the current environment.
 */
export function isWebGLAvailable(): boolean {
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
 * Checks if the animated background is enabled by environment/flag.
 * Development and staging are always on. Production is on only when VITE_FEATURES contains animatedBackground.
 */
export function isAnimatedBackgroundFlagEnabled(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const isDev = Boolean(import.meta.env.DEV);
    const env = import.meta.env.VITE_ENV;
    const isDevOrStaging = isDev || env === 'development' || env === 'staging';
    return isDevOrStaging || isFeatureEnabled('animatedBackground');
}

/**
 * Checks if device/user allows motion and WebGL (no reduced motion, no saveData, WebGL available, no ?bg=off).
 */
export function isMotionAllowed(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        return false;
    }

    interface NavigatorWithConnection extends Navigator {
        connection?: {
            saveData?: boolean;
        };
    }
    const nav = navigator as NavigatorWithConnection;
    if (nav.connection?.saveData === true) {
        return false;
    }

    if (!isWebGLAvailable()) {
        return false;
    }

    try {
        const params = new URLSearchParams(window.location.search);
        const bg = params.get('bg');
        if (bg === 'off') {
            return false;
        }
    } catch {
        // Ignore URL parsing errors
    }

    return true;
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
    if (!isAnimatedBackgroundFlagEnabled()) {
        return 'off';
    }

    // 2. Accessibility & Network Data-Saver & WebGL fallbacks
    if (!isMotionAllowed()) {
        return 'off';
    }

    // 3. Query param override ?bg=off|calm|full (evaluated only when VITE_ENV !== 'production')
    const env = import.meta.env.VITE_ENV;
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

/**
 * Determines whether a route uses the calm 3D pitch or static SVG.
 * Calm pitch routes:
 *   /, /journey, /tournaments, /tournaments/:id, /teams, /teams/:id, /players, /players/:id, /partners, /sponsors, /how-it-works
 * Static SVG routes:
 *   /matches/:matchId, /media/matches/:matchId, /contact, /privacy, /terms, /data-requests
 * Unknown routes:
 *   static SVG
 */
export function getRouteBackgroundType(pathname: string): RouteBackgroundType {
    if (
        pathname === '/' ||
        pathname === '/journey' ||
        pathname.startsWith('/journey/') ||
        pathname === '/how-it-works' ||
        pathname === '/partners' ||
        pathname === '/sponsors' ||
        pathname === '/tournaments' ||
        /^\/tournaments\/[^/]+$/.test(pathname) ||
        pathname === '/teams' ||
        /^\/teams\/[^/]+$/.test(pathname) ||
        pathname === '/organisations' ||
        /^\/organisations\/[^/]+$/.test(pathname) ||
        pathname === '/players' ||
        /^\/players\/[^/]+$/.test(pathname)
    ) {
        return 'calm';
    }

    return 'static';
}
