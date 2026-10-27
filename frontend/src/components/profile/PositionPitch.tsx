import React from 'react';

export interface PositionPitchProps {
    position?: string | null;
    jerseyNumber?: number | null;
    primaryColour?: string;
    secondaryColour?: string;
    className?: string;
}

interface PositionCoord {
    number: number;
    label: string;
    x: number;
    y: number;
}

// 15 Standard Rugby Union positions on an attacking half-pitch
const POSITIONS: PositionCoord[] = [
    { number: 1, label: 'Loosehead Prop', x: 52, y: 72 },
    { number: 2, label: 'Hooker', x: 80, y: 72 },
    { number: 3, label: 'Tighthead Prop', x: 108, y: 72 },
    { number: 4, label: 'Lock', x: 66, y: 92 },
    { number: 5, label: 'Lock', x: 94, y: 92 },
    { number: 6, label: 'Blindside Flanker', x: 44, y: 102 },
    { number: 7, label: 'Openside Flanker', x: 116, y: 102 },
    { number: 8, label: 'Number 8', x: 80, y: 108 },
    { number: 9, label: 'Scrum Half', x: 66, y: 124 },
    { number: 10, label: 'Fly Half', x: 92, y: 136 },
    { number: 11, label: 'Left Wing', x: 26, y: 134 },
    { number: 12, label: 'Inside Centre', x: 70, y: 154 },
    { number: 13, label: 'Outside Centre', x: 108, y: 160 },
    { number: 14, label: 'Right Wing', x: 134, y: 134 },
    { number: 15, label: 'Fullback', x: 80, y: 184 },
];

/**
 * Maps player position text and jersey number to active position dots.
 */
function getHighlightedPositions(
    positionStr?: string | null,
    jerseyNum?: number | null
): { numbers: number[]; displayCaption: string } {
    if (jerseyNum && jerseyNum >= 1 && jerseyNum <= 15) {
        const found = POSITIONS.find(p => p.number === jerseyNum);
        return {
            numbers: [jerseyNum],
            displayCaption: positionStr?.trim() || found?.label || `#${jerseyNum}`,
        };
    }

    if (!positionStr || !positionStr.trim()) {
        return { numbers: [], displayCaption: 'Utility' };
    }

    const clean = positionStr.toLowerCase().replace(/^reserve\s+/, '').trim();

    if (clean.includes('fly half') || clean.includes('flyhalf') || clean.includes('out-half') || clean.includes('stand-off')) {
        return { numbers: [10], displayCaption: positionStr };
    }
    if (clean.includes('hooker')) {
        return { numbers: [2], displayCaption: positionStr };
    }
    if (clean.includes('fullback') || clean.includes('full back') || clean.includes('full-back')) {
        return { numbers: [15], displayCaption: positionStr };
    }
    if (clean.includes('scrum half') || clean.includes('scrum-half') || clean.includes('scrumhalf') || clean.includes('half back') || clean.includes('halfback')) {
        return { numbers: [9], displayCaption: positionStr };
    }
    if (clean.includes('prop')) {
        if (clean.includes('tight') || clean.includes('th')) return { numbers: [3], displayCaption: positionStr };
        if (clean.includes('loose') || clean.includes('lh')) return { numbers: [1], displayCaption: positionStr };
        return { numbers: [1, 3], displayCaption: positionStr };
    }
    if (clean.includes('lock') || clean.includes('second row')) {
        return { numbers: [4, 5], displayCaption: positionStr };
    }
    if (clean.includes('flanker') || clean.includes('wing forward')) {
        if (clean.includes('open')) return { numbers: [7], displayCaption: positionStr };
        if (clean.includes('blind')) return { numbers: [6], displayCaption: positionStr };
        return { numbers: [6, 7], displayCaption: positionStr };
    }
    if (clean.includes('eight') || clean.includes('8') || clean.includes('no.8') || clean.includes('no 8')) {
        return { numbers: [8], displayCaption: positionStr };
    }
    if (clean.includes('centre') || clean.includes('center')) {
        if (clean.includes('inside') || clean.includes('12')) return { numbers: [12], displayCaption: positionStr };
        if (clean.includes('outside') || clean.includes('13')) return { numbers: [13], displayCaption: positionStr };
        return { numbers: [12, 13], displayCaption: positionStr };
    }
    if (clean.includes('wing')) {
        if (clean.includes('left') || clean.includes('11')) return { numbers: [11], displayCaption: positionStr };
        if (clean.includes('right') || clean.includes('14')) return { numbers: [14], displayCaption: positionStr };
        return { numbers: [11, 14], displayCaption: positionStr };
    }

    return { numbers: [], displayCaption: 'Utility' };
}

export const PositionPitch: React.FC<PositionPitchProps> = ({
    position,
    jerseyNumber,
    primaryColour = '#0047AB',
    className = '',
}) => {
    const { numbers, displayCaption } = getHighlightedPositions(position, jerseyNumber);

    const isHighlighted = (num: number) => numbers.includes(num);

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            <svg
                viewBox="0 0 160 206"
                role="img"
                aria-label={`Rugby pitch position indicator: ${displayCaption}`}
                className="w-full max-w-[140px] sm:max-w-[155px] h-auto drop-shadow-sm"
            >
                {/* Defs for gradients & filters */}
                <defs>
                    <radialGradient id="pitchFieldGrad" cx="50%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#132B45" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#0B1726" stopOpacity="0.95" />
                    </radialGradient>
                    <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FFFFFF" floodOpacity="0.85" />
                    </filter>
                </defs>

                {/* Pitch outline & turf surface */}
                <rect
                    x="12"
                    y="10"
                    width="136"
                    height="186"
                    rx="8"
                    fill="url(#pitchFieldGrad)"
                    stroke="rgba(255, 255, 255, 0.16)"
                    strokeWidth="1.2"
                />

                {/* Pitch Lines (white at 30% - 50% opacity) */}
                {/* Dead ball line (top) */}
                <line x1="16" y1="16" x2="144" y2="16" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" strokeDasharray="3 3" />

                {/* In-goal area */}
                <rect x="16" y="16" width="128" height="20" fill="rgba(255, 255, 255, 0.02)" />

                {/* Try Line */}
                <line x1="16" y1="36" x2="144" y2="36" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.8" />

                {/* Goal posts in Crimson with crossbar */}
                {/* Left upright */}
                <circle cx="72" cy="36" r="2.4" fill="#C1121F" stroke="#FFFFFF" strokeWidth="0.8" />
                {/* Right upright */}
                <circle cx="88" cy="36" r="2.4" fill="#C1121F" stroke="#FFFFFF" strokeWidth="0.8" />
                {/* Crossbar */}
                <line x1="72" y1="36" x2="88" y2="36" stroke="#C1121F" strokeWidth="2" />

                {/* 5-metre dashed line */}
                <line x1="20" y1="52" x2="140" y2="52" stroke="rgba(255, 255, 255, 0.22)" strokeWidth="0.8" strokeDasharray="2 3" />

                {/* 22-metre line */}
                <line x1="16" y1="86" x2="144" y2="86" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.2" />

                {/* 10-metre dashed line */}
                <line x1="20" y1="126" x2="140" y2="126" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" strokeDasharray="3 3" />

                {/* Halfway line (bottom) */}
                <line x1="16" y1="192" x2="144" y2="192" stroke="rgba(255, 255, 255, 0.65)" strokeWidth="1.6" />

                {/* Centre spot */}
                <circle cx="80" cy="192" r="1.5" fill="rgba(255, 255, 255, 0.6)" />

                {/* 15 Position Dots */}
                {POSITIONS.map(pos => {
                    const active = isHighlighted(pos.number);
                    return (
                        <g key={pos.number} className="transition-all duration-200">
                            {/* Outer ring for active dots */}
                            {active && (
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="7"
                                    fill="none"
                                    stroke={primaryColour || '#FFFFFF'}
                                    strokeWidth="1.6"
                                    opacity="0.85"
                                    filter="url(#activeGlow)"
                                />
                            )}
                            {/* Main dot */}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={active ? 4.8 : 2.6}
                                fill={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.35)'}
                                stroke={active ? '#0D1B2A' : 'none'}
                                strokeWidth={active ? 1.2 : 0}
                            />
                            {/* Number label on active dot */}
                            {active && (
                                <text
                                    x={pos.x}
                                    y={pos.y + 3.2}
                                    textAnchor="middle"
                                    fill="#0D1B2A"
                                    fontSize="8"
                                    fontWeight="900"
                                    fontFamily="Oswald, sans-serif"
                                >
                                    {pos.number}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Position caption below pitch */}
            <div className="mt-1.5 text-center">
                <span className="inline-block text-[11px] font-bold tracking-wider uppercase text-white/90 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                    {displayCaption}
                </span>
            </div>
        </div>
    );
};
