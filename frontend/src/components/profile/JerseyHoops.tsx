import React from 'react';
import { rgba } from './colours';

export interface JerseyHoopsProps {
    primary: string;
    secondary: string;
    size?: 'public' | 'compact';
    className?: string;
    opacity?: number;
}

/**
 * Absolutely positioned decorative jersey hoops.
 * Repeating horizontal bands of primary and secondary organisation colours,
 * covered by a deep navy overlay gradient.
 */
export const JerseyHoops: React.FC<JerseyHoopsProps> = ({
    primary,
    secondary,
    size = 'public',
    className = '',
    opacity = 0.85,
}) => {
    const cycle = size === 'public' ? 56 : 36;
    const band1 = Math.round(cycle * 0.28);
    const gap1 = Math.round(cycle * 0.20);
    const band2 = Math.round(cycle * 0.32);
    const gap2 = cycle - (band1 + gap1 + band2);

    const stop1End = band1;
    const stop2Start = stop1End;
    const stop2End = stop2Start + gap1;
    const stop3Start = stop2End;
    const stop3End = stop3Start + band2;
    const stop4Start = stop3End;
    const stop4End = stop4Start + gap2;

    const repeatingGradient = `repeating-linear-gradient(
        to bottom,
        ${rgba(primary, 0.55)} 0px,
        ${rgba(primary, 0.55)} ${stop1End}px,
        transparent ${stop2Start}px,
        transparent ${stop2End}px,
        ${rgba(secondary, 0.50)} ${stop3Start}px,
        ${rgba(secondary, 0.50)} ${stop3End}px,
        transparent ${stop4Start}px,
        transparent ${stop4End}px
    )`;

    return (
        <div
            aria-hidden="true"
            className={`absolute inset-0 pointer-events-none select-none overflow-hidden ${className}`}
            style={{ opacity }}
        >
            {/* Repeating jersey hoops */}
            <div
                className="absolute inset-0"
                style={{ backgroundImage: repeatingGradient }}
            />
            {/* Navy gradient overlay: deep navy on left to 55% navy on right */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(90deg, #0D1B2A 0%, rgba(13, 27, 42, 0.82) 40%, rgba(13, 27, 42, 0.55) 100%)',
                }}
            />
            {/* Subtle top/bottom edge vignette */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(180deg, rgba(13, 27, 42, 0.4) 0%, transparent 25%, transparent 75%, rgba(13, 27, 42, 0.6) 100%)',
                }}
            />
        </div>
    );
};
