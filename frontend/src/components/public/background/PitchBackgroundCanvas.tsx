import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteBackgroundType, type RouteBackgroundType } from '@/config/animatedBackground';
import type { PitchBackgroundController } from './PitchBackgroundScene';
import clsx from 'clsx';

export interface PitchBackgroundCanvasProps {
    onSceneReadyChange?: (isReady: boolean) => void;
    isAuthPanel?: boolean;
    className?: string;
}

export const PitchBackgroundCanvas: React.FC<PitchBackgroundCanvasProps> = ({
    onSceneReadyChange,
    isAuthPanel = false,
    className,
}) => {
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<PitchBackgroundController | null>(null);

    const [isSceneReady, setIsSceneReady] = useState(false);
    const [hasVisitedCalmRoute, setHasVisitedCalmRoute] = useState(false);

    const currentRouteType: RouteBackgroundType = isAuthPanel
        ? 'calm'
        : getRouteBackgroundType(location.pathname);

    // Track if user has visited a calm route (don't load Three.js if initial route is static)
    useEffect(() => {
        if (currentRouteType === 'calm' && !hasVisitedCalmRoute) {
            setHasVisitedCalmRoute(true);
        }
    }, [currentRouteType, hasVisitedCalmRoute]);

    // Handle scene creation and disposal based on route
    const initScene = useCallback(() => {
        if (!containerRef.current || controllerRef.current) return;

        import('./PitchBackgroundScene')
            .then(({ mountPitchBackgroundScene }) => {
                if (!containerRef.current || controllerRef.current) return;

                controllerRef.current = mountPitchBackgroundScene({
                    container: containerRef.current,
                    isAuthPanel,
                    onReady: () => {
                        setIsSceneReady(true);
                        onSceneReadyChange?.(true);
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
    }, [isAuthPanel, onSceneReadyChange]);

    const disposeScene = useCallback(() => {
        if (controllerRef.current) {
            controllerRef.current.dispose();
            controllerRef.current = null;
        }
        setIsSceneReady(false);
        onSceneReadyChange?.(false);
    }, [onSceneReadyChange]);

    // Mount / dispose based on route:
    // On /journey: dispose the scene completely so journey's canvas is the only WebGL context
    // If not visited calm route yet: do not initialize Three.js
    useEffect(() => {
        if (currentRouteType === 'journey') {
            disposeScene();
            return;
        }

        if (hasVisitedCalmRoute) {
            if (!controllerRef.current) {
                initScene();
            } else {
                controllerRef.current.setRouteMode(currentRouteType === 'calm' ? 'calm' : 'static');
                if (currentRouteType === 'calm') {
                    controllerRef.current.triggerSettleReplay();
                }
                controllerRef.current.updateQuietRect();
            }
        }
    }, [currentRouteType, hasVisitedCalmRoute, initScene, disposeScene]);

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
                'absolute inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-[600ms]',
                isVisible ? 'opacity-100' : 'opacity-0',
                className
            )}
        />
    );
};
