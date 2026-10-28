import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteBackgroundType, type RouteBackgroundType } from '@/config/animatedBackground';
import type { PitchBackgroundController } from './PitchBackgroundScene';
import clsx from 'clsx';

export interface PitchBackgroundCanvasProps {
    onSceneReadyChange?: (isReady: boolean) => void;
    className?: string;
    motionAllowed?: boolean;
}

export const PitchBackgroundCanvas: React.FC<PitchBackgroundCanvasProps> = ({
    onSceneReadyChange,
    className,
    motionAllowed = true,
}) => {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<PitchBackgroundController | null>(null);

    const [isSceneReady, setIsSceneReady] = useState(false);
    const [hasVisitedCalmRoute, setHasVisitedCalmRoute] = useState(false);

    const currentRouteType: RouteBackgroundType = getRouteBackgroundType(location.pathname);
    const isJourney = location.pathname === '/journey' || location.pathname.startsWith('/journey/');

    // Track if user has visited a calm route (don't load Three.js if initial route is static)
    useEffect(() => {
        if (currentRouteType === 'calm' && !hasVisitedCalmRoute) {
            setHasVisitedCalmRoute(true);
        }
    }, [currentRouteType, hasVisitedCalmRoute]);

    // Delayed "start when ready": wait for window load (or immediate if complete),
    // then schedule via requestIdleCallback (timeout 2500ms) or setTimeout (1200ms)
    useEffect(() => {
        if (!hasVisitedCalmRoute || !motionAllowed || controllerRef.current) {
            return;
        }

        let isCancelled = false;
        let idleId: number | null = null;
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const scheduleBuild = () => {
            if (isCancelled || !containerRef.current || controllerRef.current) return;

            import('./PitchBackgroundScene')
                .then(({ mountPitchBackgroundScene }) => {
                    if (isCancelled || !containerRef.current || controllerRef.current) return;
                    const isJourneyNow = window.location.pathname === '/journey' || window.location.pathname.startsWith('/journey/');
                    const routeTypeNow = getRouteBackgroundType(window.location.pathname);

                    controllerRef.current = mountPitchBackgroundScene({
                        container: containerRef.current,
                        initialRouteMode: routeTypeNow === 'calm' ? 'calm' : 'static',
                        initialKickEnabled: !isJourneyNow,
                        onReady: () => {
                            setIsSceneReady(true);
                            onSceneReadyChange?.(true);
                            const isJourneyAtReady = window.location.pathname === '/journey' || window.location.pathname.startsWith('/journey/');
                            const routeTypeAtReady = getRouteBackgroundType(window.location.pathname);
                            controllerRef.current?.setRouteMode(routeTypeAtReady === 'calm' ? 'calm' : 'static', {
                                enableKick: !isJourneyAtReady,
                            });
                        },
                        onContextLost: () => {
                            setIsSceneReady(false);
                            onSceneReadyChange?.(false);
                            if (controllerRef.current) {
                                controllerRef.current.dispose();
                                controllerRef.current = null;
                            }
                        },
                    });
                })
                .catch((err) => {
                    if (import.meta.env.DEV) {
                        console.warn('[PitchBackgroundCanvas] Failed to load background scene:', err);
                    }
                });
        };

        const onWindowReady = () => {
            if (isCancelled) return;
            const win = window as Window & {
                requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
                cancelIdleCallback?: (id: number) => void;
            };
            if (typeof win.requestIdleCallback === 'function') {
                idleId = win.requestIdleCallback(() => scheduleBuild(), { timeout: 2500 });
            } else {
                timerId = setTimeout(() => scheduleBuild(), 1200);
            }
        };

        if (document.readyState === 'complete') {
            onWindowReady();
        } else {
            window.addEventListener('load', onWindowReady, { once: true });
        }

        return () => {
            isCancelled = true;
            window.removeEventListener('load', onWindowReady);
            const win = window as Window & {
                cancelIdleCallback?: (id: number) => void;
            };
            if (idleId !== null && typeof win.cancelIdleCallback === 'function') {
                win.cancelIdleCallback(idleId);
            }
            if (timerId !== null) {
                clearTimeout(timerId);
            }
        };
    }, [hasVisitedCalmRoute, motionAllowed, onSceneReadyChange]);

    const disposeScene = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.dispose();
            controllerRef.current = null;
        }
        setIsSceneReady(false);
        onSceneReadyChange?.(false);
    }, [onSceneReadyChange]);

    // Update route mode if controller is already mounted
    useEffect(() => {
        if (controllerRef.current) {
            controllerRef.current.setRouteMode(currentRouteType === 'calm' ? 'calm' : 'static', {
                enableKick: !isJourney,
            });
            if (currentRouteType === 'calm') {
                controllerRef.current.triggerSettleReplay();
            }
            controllerRef.current.updateQuietRect();
        }
    }, [currentRouteType, isJourney]);

    // Update quiet zone rect on route change
    useEffect(() => {
        if (controllerRef.current) {
            controllerRef.current.updateQuietRect();
        }
    }, [location.pathname]);

    // Window resize observer
    useEffect(() => {
        const handleResize = () => {
            if (controllerRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                controllerRef.current.resize(rect.width || window.innerWidth, rect.height || window.innerHeight);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Full cleanup on unmount
    useEffect(() => {
        return () => {
            disposeScene();
        };
    }, [disposeScene]);

    // Visibility: fade in over 600ms when ready AND on calm route
    const isVisible = isSceneReady && currentRouteType === 'calm';

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className={clsx(
                'absolute inset-0 pointer-events-none z-0 overflow-hidden [contain:strict] transition-opacity duration-[600ms]',
                isVisible ? 'opacity-100' : 'opacity-0',
                className
            )}
        />
    );
};
