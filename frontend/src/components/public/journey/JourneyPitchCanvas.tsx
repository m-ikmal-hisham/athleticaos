import React, { useEffect, useRef } from 'react';
import { getAnimatedBackgroundMode } from '@/config/animatedBackground';
import type { SceneController } from './JourneyPitchScene';

export interface JourneyPitchCanvasProps {
    isDesktop: boolean;
    fieldWrapperRef: React.RefObject<HTMLDivElement>;
}

export function JourneyPitchCanvas({ isDesktop, fieldWrapperRef }: JourneyPitchCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<SceneController | null>(null);

    useEffect(() => {
        const mode = getAnimatedBackgroundMode();
        if (mode === 'off') {
            return;
        }

        let isCancelled = false;
        let idleId: number | null = null;
        let timeoutId: number | null = null;

        const initScene = () => {
            if (isCancelled || !containerRef.current || !fieldWrapperRef.current) return;

            import('./JourneyPitchScene')
                .then(({ mountJourneyPitchScene }) => {
                    if (isCancelled || !containerRef.current || !fieldWrapperRef.current) return;
                    controllerRef.current = mountJourneyPitchScene(
                        containerRef.current,
                        fieldWrapperRef.current,
                        mode
                    );
                })
                .catch((err) => {
                    // Fail silently without breaking the accessible SVG field
                    if (import.meta.env.DEV) {
                        console.warn('[JourneyPitchCanvas] Failed to load Three.js scene:', err);
                    }
                });
        };

        // Defer until after page paint
        const globalWin = typeof window !== 'undefined' ? window : null;
        const requestIdle = globalWin
            ? (globalWin as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
            : undefined;

        if (typeof requestIdle === 'function') {
            idleId = requestIdle(initScene, { timeout: 1200 });
        } else if (globalWin) {
            timeoutId = globalWin.setTimeout(initScene, 200);
        }

        return () => {
            isCancelled = true;
            if (globalWin) {
                const cancelIdle = (globalWin as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
                if (idleId !== null && typeof cancelIdle === 'function') {
                    cancelIdle(idleId);
                }
                if (timeoutId !== null) {
                    globalWin.clearTimeout(timeoutId);
                }
            }
            if (controllerRef.current) {
                controllerRef.current.dispose();
                controllerRef.current = null;
            }
        };
    }, [fieldWrapperRef]);

    // Handle layout / desktop resize
    useEffect(() => {
        if (controllerRef.current) {
            controllerRef.current.resize(isDesktop);
        }
    }, [isDesktop]);

    return (
        <div
            ref={containerRef}
            data-journey-bg
            className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
            aria-hidden="true"
        />
    );
}
