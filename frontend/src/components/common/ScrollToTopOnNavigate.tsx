import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * ScrollToTopOnNavigate
 *
 * Forces the viewport to (0, 0) on forward or replace navigation (PUSH or REPLACE)
 * when location.pathname changes.
 *
 * On iOS Safari, if the user navigated while momentum-gliding, Safari's inertial scroll
 * engine continues running on the new page, overriding ScrollRestoration's (0, 0).
 *
 * To kill inertia reliably:
 * 1. Sets document.documentElement.style.overflow = 'hidden'.
 * 2. Calls window.scrollTo(0, 0).
 * 3. In the NEXT requestAnimationFrame, restores html overflow and calls window.scrollTo(0, 0) again.
 * 4. Schedules one more window.scrollTo(0, 0) at ~300ms for lazy-loaded pages.
 * 5. If the user initiates any touch, wheel, or key interaction before repeats complete,
 *    all pending repeats are cancelled immediately and overflow is restored so interaction is never blocked.
 *
 * Back/Forward (POP) navigations are ignored so ScrollRestoration can restore history positions.
 * Same-page search-param changes (e.g. ?view=) are ignored so tabs and filters do not jump.
 */
export function ScrollToTopOnNavigate() {
    const location = useLocation();
    const navigationType = useNavigationType();
    const prevPathnameRef = useRef(location.pathname);
    const cancelRepeatsRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        const isPathChange = location.pathname !== prevPathnameRef.current;
        const isForwardOrReplace = navigationType === 'PUSH' || navigationType === 'REPLACE';

        prevPathnameRef.current = location.pathname;

        if (!isPathChange || !isForwardOrReplace || typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        // Cancel any pending repeats from a previous fast navigation
        cancelRepeatsRef.current?.();

        const docEl = document.documentElement;
        const prevOverflow = docEl.style.overflow;
        docEl.style.overflow = 'hidden';
        window.scrollTo(0, 0);

        let rafId: number | null = null;
        let timerId: number | null = null;
        let overflowRestored = false;

        const restoreOverflow = () => {
            if (!overflowRestored) {
                overflowRestored = true;
                docEl.style.overflow = prevOverflow;
            }
        };

        const cleanup = () => {
            restoreOverflow();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (timerId !== null) {
                window.clearTimeout(timerId);
                timerId = null;
            }
            window.removeEventListener('touchstart', onUserGesture, { capture: true });
            window.removeEventListener('wheel', onUserGesture, { capture: true });
            window.removeEventListener('keydown', onUserGesture, { capture: true });
            if (cancelRepeatsRef.current === cleanup) {
                cancelRepeatsRef.current = null;
            }
        };

        const onUserGesture = () => {
            cleanup();
        };

        window.addEventListener('touchstart', onUserGesture, { capture: true, passive: true });
        window.addEventListener('wheel', onUserGesture, { capture: true, passive: true });
        window.addEventListener('keydown', onUserGesture, { capture: true, passive: true });

        cancelRepeatsRef.current = cleanup;

        // Next frame: restore overflow and scroll to (0, 0)
        rafId = requestAnimationFrame(() => {
            rafId = null;
            restoreOverflow();
            window.scrollTo(0, 0);
        });

        // ~300ms repeat: handles lazy-loaded chunks rendering later on slow networks
        timerId = window.setTimeout(() => {
            timerId = null;
            window.scrollTo(0, 0);
            cleanup();
        }, 300);

        return () => {
            cleanup();
        };
    }, [location.pathname, navigationType]);

    return null;
}

