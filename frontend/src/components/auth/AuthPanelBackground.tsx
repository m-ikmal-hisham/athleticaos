import React, { useState } from 'react';
import {
    isAnimatedBackgroundFlagEnabled,
    isMotionAllowed,
} from '@/config/animatedBackground';
import { PitchBackdropSvg } from '@/components/public/background/PitchBackdropSvg';
import { PitchBackgroundCanvas } from '@/components/public/background/PitchBackgroundCanvas';
import clsx from 'clsx';

export interface AuthPanelBackgroundProps {
    children?: React.ReactNode;
    legacyImageSrc?: string;
    legacyImageClassName?: string;
    className?: string;
}

export const AuthPanelBackground: React.FC<AuthPanelBackgroundProps> = ({
    children,
    legacyImageSrc = '/athleticaos-bg-light-new.png',
    legacyImageClassName = 'opacity-100 dark:opacity-[0.08]',
    className,
}) => {
    const [sceneReady, setSceneReady] = useState(false);

    const flagEnabled = isAnimatedBackgroundFlagEnabled();
    // Probe once per mount: isMotionAllowed() creates a WebGL context to test support
    const [motionAllowed] = useState(isMotionAllowed);

    // 1. Production / Flag Off: render today's exact image
    if (!flagEnabled) {
        return (
            <div
                className={clsx(
                    'hidden lg:flex flex-1 relative bg-white dark:bg-deep-navy overflow-hidden items-center justify-center p-12',
                    className
                )}
            >
                <img
                    src={legacyImageSrc}
                    alt="AthleticaOS Background"
                    className={clsx('absolute inset-0 w-full h-full object-cover', legacyImageClassName)}
                />
                {children}
            </div>
        );
    }

    // 2. Motion not allowed: static SVG only
    if (!motionAllowed) {
        return (
            <div
                className={clsx(
                    'hidden lg:flex flex-1 relative bg-white dark:bg-deep-navy overflow-hidden items-center justify-center p-12',
                    className
                )}
            >
                <PitchBackdropSvg isAuthPanel visible={true} />
                {children}
            </div>
        );
    }

    // 3. Switch ON and motion allowed: SVG first paint, then calm pitch WebGL canvas with cross-fade
    return (
        <div
            className={clsx(
                'hidden lg:flex flex-1 relative bg-white dark:bg-deep-navy overflow-hidden items-center justify-center p-12',
                className
            )}
        >
            <PitchBackdropSvg isAuthPanel visible={!sceneReady} />
            <PitchBackgroundCanvas isAuthPanel onSceneReadyChange={setSceneReady} />
            {children}
        </div>
    );
};
