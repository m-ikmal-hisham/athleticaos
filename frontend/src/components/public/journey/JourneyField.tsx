import React, { useId, useMemo, useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Journey, Milestone, SetPiece } from '@/content/journey';
import {
    getPitchMarkingLines,
    generateDenseRoute,
    project,
    runDevFieldAssertions,
    type CameraPreset,
} from './fieldProjection';
import { JourneyPitchCanvas } from './JourneyPitchCanvas';

// ----------------------------------------------------------------------
// Set-piece SVG glyphs (simple, crisp 16x16 icon map)
// ----------------------------------------------------------------------
export function SetPieceIcon({
    piece,
    className,
    x,
    y,
    width,
    height,
}: {
    piece: SetPiece;
    className?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}) {
    switch (piece) {
        case 'kick':
            // Rugby boot arc / kick trajectory
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <path d="M4 18c3-6 9-10 16-10" />
                    <ellipse cx="18" cy="8" rx="3" ry="2" transform="rotate(-30 18 8)" fill="currentColor" />
                    <path d="M3 20l3-2-2-4" />
                </svg>
            );
        case 'phase':
            // Two forward phase progression chevrons
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <path d="M7 6l6 6-6 6" />
                    <path d="M13 6l6 6-6 6" />
                </svg>
            );
        case 'scrum':
            // Interlocking front rows
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <circle cx="8" cy="8" r="3" fill="currentColor" />
                    <circle cx="16" cy="16" r="3" fill="currentColor" />
                    <path d="M10 10l4 4" />
                    <path d="M5 15l4-2" />
                    <path d="M19 9l-4 2" />
                </svg>
            );
        case 'lineout':
            // Two jumpers reaching high
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <path d="M8 4v16" />
                    <path d="M16 4v16" />
                    <path d="M5 8h6" />
                    <path d="M13 8h6" />
                    <circle cx="12" cy="3" r="1.5" fill="currentColor" />
                </svg>
            );
        case 'ruck':
            // Ruck contest over grounded ball
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <ellipse cx="12" cy="18" rx="4" ry="2.5" fill="currentColor" />
                    <path d="M6 14l6-6 6 6" />
                    <path d="M9 10l3-4 3 4" />
                </svg>
            );
        case 'maul':
            // Forward driving pack bound together
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <circle cx="9" cy="9" r="2.5" fill="currentColor" />
                    <circle cx="15" cy="9" r="2.5" fill="currentColor" />
                    <circle cx="12" cy="15" r="2.5" fill="currentColor" />
                    <path d="M9 11.5l3 3.5 3-3.5" />
                    <path d="M12 17.5v3" />
                </svg>
            );
        case 'try':
            // Ball grounded over try line with grounding burst
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2.5" />
                    <ellipse cx="12" cy="14" rx="4.5" ry="3" fill="currentColor" />
                    <path d="M12 4v4M6 6l3 3M18 6l-3 3" />
                </svg>
            );
        case 'conv':
            // Conversion sailing through uprights
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <line x1="6" y1="4" x2="6" y2="20" />
                    <line x1="18" y1="4" x2="18" y2="20" />
                    <line x1="6" y1="13" x2="18" y2="13" />
                    <ellipse cx="12" cy="7" rx="2.5" ry="3.5" fill="currentColor" />
                </svg>
            );
    }
}

// ----------------------------------------------------------------------
// Rugby Ball SVG
// ----------------------------------------------------------------------
export function RugbyBallSVG({
    className,
    style,
    x,
    y,
    width,
    height,
}: {
    className?: string;
    style?: React.CSSProperties;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}) {
    return (
        <svg
            viewBox="0 0 32 20"
            x={x}
            y={y}
            width={width}
            height={height}
            className={className}
            style={style}
            aria-hidden="true"
        >
            {/* Ball outer leather */}
            <ellipse cx="16" cy="10" rx="15" ry="9" fill="#8B4513" stroke="#4A2508" strokeWidth="1" />
            {/* Grip stripes / seam */}
            <path d="M1 10 C 10 3, 22 3, 31 10 C 22 17, 10 17, 1 10 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.85" />
            {/* Laces */}
            <line x1="16" y1="6" x2="16" y2="14" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="13" y1="7.5" x2="13" y2="12.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="19" y1="7.5" x2="19" y2="12.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
    );
}

// ----------------------------------------------------------------------
// Media Query Hooks
// ----------------------------------------------------------------------
function useIsLg(): boolean {
    const [isLg, setIsLg] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.matchMedia('(min-width: 1024px)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(min-width: 1024px)');
        const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
        setIsLg(mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return isLg;
}

function usePrefersReducedMotion(): boolean {
    const [reduced, setReduced] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        setReduced(mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return reduced;
}

// ----------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------
export interface JourneyFieldProps {
    journey: Journey;
    selectedMilestone: Milestone;
    onSelectMilestone: (m: Milestone) => void;
    lang: 'en' | 'ms';
}

export function JourneyField({
    journey,
    selectedMilestone,
    onSelectMilestone,
    lang,
}: JourneyFieldProps) {
    const { t: tJourney } = useTranslation('journey');
    const isDesktop = useIsLg();
    const prefersReducedMotion = usePrefersReducedMotion();
    const fieldWrapperRef = useRef<HTMLDivElement>(null);

    const [focusedMilestoneId, setFocusedMilestoneId] = useState<string | null>(null);
    const leaveTimer = useRef<number | null>(null);

    const hoverMilestone = React.useCallback((id: string | null) => {
        if (leaveTimer.current !== null) {
            window.clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
        }
        if (id) {
            setFocusedMilestoneId(id);
        } else {
            leaveTimer.current = window.setTimeout(() => setFocusedMilestoneId(null), 80);
        }
    }, []);

    useEffect(() => () => {
        if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current);
    }, []);

    const [hasAnimatedBall, setHasAnimatedBall] = useState(false);
    const animId = useId();

    const milestones = journey.milestones;
    const currentMilestoneIndex = useMemo(() => {
        const idx = milestones.findIndex((m) => m.status === 'current');
        return idx >= 0 ? idx : milestones.length - 1;
    }, [milestones]);

    // Active target milestone for highlight (hover/focus wins over selection)
    const activeHoverIndex = useMemo(() => {
        if (focusedMilestoneId) {
            const idx = milestones.findIndex((m) => m.id === focusedMilestoneId);
            if (idx >= 0) return idx;
        }
        return null;
    }, [focusedMilestoneId, milestones]);

    // Track if ball has animated for this journey
    useEffect(() => {
        setHasAnimatedBall(false);
        const timer = setTimeout(() => setHasAnimatedBall(true), 1300);
        return () => clearTimeout(timer);
    }, [journey.id]);

    // Dev-only assertions check
    useEffect(() => {
        runDevFieldAssertions();
    }, []);

    // Active camera preset
    const preset: CameraPreset = isDesktop ? 'sideline' : 'behindPosts';

    // Projected ground markings
    const projectedMarkings = useMemo(() => {
        const groundLines = getPitchMarkingLines();
        return groundLines.map((line) => {
            const p1 = project(line.x1, line.z1, preset);
            const p2 = project(line.x2, line.z2, preset);
            return {
                id: line.id,
                type: line.type,
                isTryLine: Boolean(line.isTryLine),
                x1: p1.x,
                y1: p1.y,
                x2: p2.x,
                y2: p2.y,
            };
        });
    }, [preset]);

    // Halfway centre spot
    const centreSpot = useMemo(() => project(60, 35, preset), [preset]);

    // Dense route generation (shared by SVG path, milestone positions & ball travel)
    const routeData = useMemo(() => {
        return generateDenseRoute(milestones.length, preset);
    }, [milestones.length, preset]);

    const coords = routeData.milestonePoints;
    const startPosts = routeData.startPost;
    const goalPosts = routeData.goalPost;

    // Segmented paths for route styling & hover highlighting
    const pathSegments = useMemo(() => {
        const segments: { path: string; fromIdx: number; toIdx: number }[] = [];
        if (coords.length === 0) return segments;

        // 0: Start post to first milestone
        const firstM = coords[0];
        let dStart = `M ${startPosts.x.toFixed(2)} ${startPosts.y.toFixed(2)}`;
        for (let i = 0; i <= firstM.sampleIndex; i++) {
            const s = routeData.samples[i];
            dStart += ` L ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
        }
        segments.push({
            path: dStart,
            fromIdx: -1,
            toIdx: 0,
        });

        // Between consecutive milestones
        for (let m = 0; m < coords.length - 1; m++) {
            const mFrom = coords[m];
            const mTo = coords[m + 1];
            let dSeg = `M ${mFrom.x.toFixed(2)} ${mFrom.y.toFixed(2)}`;
            for (let i = mFrom.sampleIndex + 1; i <= mTo.sampleIndex; i++) {
                const s = routeData.samples[i];
                dSeg += ` L ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
            }
            segments.push({
                path: dSeg,
                fromIdx: m,
                toIdx: m + 1,
            });
        }

        // Last milestone to goal post
        const lastM = coords[coords.length - 1];
        let dEnd = `M ${lastM.x.toFixed(2)} ${lastM.y.toFixed(2)}`;
        for (let i = lastM.sampleIndex + 1; i < routeData.samples.length; i++) {
            const s = routeData.samples[i];
            dEnd += ` L ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
        }
        dEnd += ` L ${goalPosts.x.toFixed(2)} ${goalPosts.y.toFixed(2)}`;
        segments.push({
            path: dEnd,
            fromIdx: coords.length - 1,
            toIdx: coords.length,
        });

        return segments;
    }, [coords, startPosts, goalPosts, routeData]);

    // Current ball resting position
    const restPos = useMemo(() => {
        return coords[currentMilestoneIndex] || { x: centreSpot.x, y: centreSpot.y };
    }, [coords, currentMilestoneIndex, centreSpot]);

    // Ball travel along dense route samples
    const [travel, setTravel] = useState(1);
    useEffect(() => {
        if (prefersReducedMotion) {
            setTravel(1);
            return;
        }
        let frame = 0;
        const start = performance.now();
        const duration = 1200;
        const step = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            setTravel(1 - Math.pow(1 - p, 3)); // ease-out
            if (p < 1) frame = requestAnimationFrame(step);
        };
        setTravel(0);
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [journey.id, prefersReducedMotion]);

    const ballPos = useMemo(() => {
        if (travel >= 1) return restPos;
        const targetSampleIndex = coords[currentMilestoneIndex]?.sampleIndex ?? 0;
        if (targetSampleIndex <= 0) return restPos;

        const floatIndex = travel * targetSampleIndex;
        const baseIndex = Math.floor(floatIndex);
        const frac = floatIndex - baseIndex;

        const s0 = routeData.samples[baseIndex];
        const s1 = routeData.samples[Math.min(targetSampleIndex, baseIndex + 1)];

        if (!s0 || !s1) return restPos;

        return {
            x: s0.x + (s1.x - s0.x) * frac,
            y: s0.y + (s1.y - s0.y) * frac,
        };
    }, [travel, restPos, coords, currentMilestoneIndex, routeData]);

    // Ball rotation towards hovered milestone (<= 15 deg)
    const ballRotation = useMemo(() => {
        if (activeHoverIndex === null || activeHoverIndex === currentMilestoneIndex || prefersReducedMotion) {
            return 0;
        }
        const target = coords[activeHoverIndex];
        if (!target) return 0;
        const dx = target.x - ballPos.x;
        const dy = target.y - ballPos.y;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;

        if (isDesktop) {
            if (deg > 180) deg -= 360;
            return Math.max(-15, Math.min(15, deg));
        } else {
            // For vertical layout, primary axis is 90 deg down
            deg -= 90;
            if (deg > 180) deg -= 360;
            if (deg < -180) deg += 360;
            return Math.max(-15, Math.min(15, deg));
        }
    }, [activeHoverIndex, currentMilestoneIndex, coords, ballPos, prefersReducedMotion, isDesktop]);

    // Keyboard navigation (Arrow keys move between milestones)
    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let nextIndex = index;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = Math.min(milestones.length - 1, index + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = Math.max(0, index - 1);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectMilestone(milestones[index]);
            return;
        } else if (e.key === 'Home') {
            e.preventDefault();
            nextIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            nextIndex = milestones.length - 1;
        }

        if (nextIndex !== index) {
            const nextMilestone = milestones[nextIndex];
            onSelectMilestone(nextMilestone);
            setFocusedMilestoneId(nextMilestone.id);
            const btn = document.getElementById(`milestone-btn-${nextMilestone.id}`);
            btn?.focus();
        }
    };

    // ViewBox:
    // Desktop: 0 0 1000 480
    // Mobile: cropped frame "0 240 440 600"
    const viewBox = isDesktop ? '0 0 1000 480' : '0 240 440 600';

    return (
        <div
            ref={fieldWrapperRef}
            className="relative w-full overflow-hidden rounded-xl bg-surface-card border border-line-subtle shadow-sm select-none"
        >
            {/* Background layer for Three.js pitch background mounting */}
            <JourneyPitchCanvas isDesktop={isDesktop} fieldWrapperRef={fieldWrapperRef} />

            <svg
                viewBox={viewBox}
                className="relative z-10 w-full h-auto block"
                role="img"
                aria-label={`Rugby field showing ${journey.title[lang]} journey route`}
            >
                <defs>
                    {/* Subtle pulse animation for LIVE / current milestone */}
                    <radialGradient id={`current-pulse-${animId}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#C1121F" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#C1121F" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* ---------------------------------------------------------- */}
                {/* 1. Rugby Pitch Markings in Perspective                     */}
                {/* ---------------------------------------------------------- */}
                <g className="pointer-events-none">
                    {projectedMarkings.map((line) => {
                        const isTry = line.isTryLine;
                        return (
                            <line
                                key={line.id}
                                x1={line.x1.toFixed(1)}
                                y1={line.y1.toFixed(1)}
                                x2={line.x2.toFixed(1)}
                                y2={line.y2.toFixed(1)}
                                stroke={isTry ? '#C1121F' : 'currentColor'}
                                strokeWidth={isTry ? 3 : line.id.startsWith('touch') || line.id === 'halfway' ? 2 : 1.5}
                                strokeDasharray={line.type === 'dashed' ? '6 6' : undefined}
                                opacity={isTry ? 0.45 : 0.16}
                                className={clsx(!isTry && 'text-navy dark:text-navy-tint')}
                            />
                        );
                    })}

                    {/* Halfway centre spot */}
                    <circle
                        cx={centreSpot.x.toFixed(1)}
                        cy={centreSpot.y.toFixed(1)}
                        r="3.5"
                        fill="currentColor"
                        opacity="0.22"
                        className="text-navy dark:text-navy-tint"
                    />
                </g>

                {/* ---------------------------------------------------------- */}
                {/* 2. Goal Posts Upright (Vertical in Screen Space)           */}
                {/* ---------------------------------------------------------- */}
                {/* Start posts (AthleticaOS Brand Mark) */}
                <g className="pointer-events-none" transform={`translate(${startPosts.x.toFixed(1)}, ${startPosts.y.toFixed(1)})`}>
                    {/* Uprights extending vertical screen space upwards */}
                    <line x1="-12" y1="0" x2="-12" y2="-42" stroke="rgb(var(--brand))" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                    <line x1="12" y1="0" x2="12" y2="-42" stroke="rgb(var(--brand))" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
                    <circle cx="-12" cy="-40" r="3" fill="rgb(var(--brand))" />
                    <circle cx="12" cy="-40" r="3" fill="rgb(var(--brand))" />
                    {/* Crossbar */}
                    <line x1="-12" y1="-20" x2="12" y2="-20" stroke="rgb(var(--brand))" strokeWidth="2.2" />
                    {/* AthleticaOS Mark Monogram badge */}
                    <g transform="translate(-18, -32)">
                        <rect width="36" height="20" rx="5" fill="rgb(var(--brand))" />
                        <text x="18" y="14" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800" fontFamily="Oswald, sans-serif">
                            ATH
                        </text>
                    </g>
                </g>

                {/* Goal posts (Far Try Line - Labelled with Journey Goal) */}
                <g className="pointer-events-none" transform={`translate(${goalPosts.x.toFixed(1)}, ${goalPosts.y.toFixed(1)})`}>
                    <line x1="-12" y1="0" x2="-12" y2="-38" stroke="rgb(var(--brand))" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    <line x1="12" y1="0" x2="12" y2="-38" stroke="rgb(var(--brand))" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                    <circle cx="-12" cy="-36" r="2.8" fill="rgb(var(--brand))" />
                    <circle cx="12" cy="-36" r="2.8" fill="rgb(var(--brand))" />
                    <line x1="-12" y1="-18" x2="12" y2="-18" stroke="rgb(var(--brand))" strokeWidth="2" />
                    {/* Goal label badge */}
                    <g transform="translate(-32, -34)">
                        <rect width="64" height="22" rx="5" fill="rgb(var(--brand))" opacity="0.92" />
                        <text x="32" y="11" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="700" fontFamily="Inter, sans-serif">
                            TRY LINE
                        </text>
                        <text x="32" y="19" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="600" opacity="0.85">
                            GOAL
                        </text>
                    </g>
                </g>

                {/* ---------------------------------------------------------- */}
                {/* 3. Curved Route Segments                                    */}
                {/* ---------------------------------------------------------- */}
                <g className="route-segments">
                    {pathSegments.map((seg, idx) => {
                        const isDone = seg.toIdx <= currentMilestoneIndex;
                        const isHighlighted =
                            activeHoverIndex !== null &&
                            activeHoverIndex !== currentMilestoneIndex &&
                            ((seg.fromIdx >= Math.min(currentMilestoneIndex, activeHoverIndex) &&
                                seg.toIdx <= Math.max(currentMilestoneIndex, activeHoverIndex)));

                        return (
                            <path
                                key={idx}
                                d={seg.path}
                                fill="none"
                                stroke={isHighlighted ? '#0047AB' : isDone ? 'rgb(var(--brand))' : 'rgb(var(--brand))'}
                                strokeWidth={isHighlighted ? 4 : isDone ? 3 : 2}
                                strokeDasharray={isHighlighted ? undefined : isDone ? undefined : '6 6'}
                                opacity={isHighlighted ? 1 : isDone ? 0.75 : 0.28}
                                strokeLinecap="round"
                                className="motion-safe:transition-all motion-safe:duration-200"
                            />
                        );
                    })}
                </g>

                {/* ---------------------------------------------------------- */}
                {/* 4. Milestones Buttons & Nodes (Decision F)                 */}
                {/* ---------------------------------------------------------- */}
                {milestones.map((milestone, idx) => {
                    const pos = coords[idx];
                    if (!pos) return null;
                    const isSelected = selectedMilestone.id === milestone.id;
                    const isHovered = focusedMilestoneId === milestone.id;
                    const isCurrent = milestone.status === 'current';
                    const isDone = milestone.status === 'done';

                    return (
                        <g key={milestone.id} transform={`translate(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`}>
                            {/* LIVE Pulse on Current milestone */}
                            {isCurrent && (
                                <circle
                                    cx="0"
                                    cy="0"
                                    r="24"
                                    fill={`url(#current-pulse-${animId})`}
                                    className="motion-safe:animate-ping opacity-75"
                                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                                    pointerEvents="none"
                                />
                            )}

                            {/* Active focus / hover ring */}
                            {(isSelected || isHovered) && (
                                <circle
                                    cx="0"
                                    cy="0"
                                    r="22"
                                    fill="none"
                                    stroke="rgb(var(--brand))"
                                    strokeWidth="2.5"
                                    strokeDasharray={isSelected ? undefined : '3 3'}
                                    className="opacity-90"
                                    pointerEvents="none"
                                />
                            )}

                            {/* Native SVG button group (no foreignObject) */}
                            <g
                                id={`milestone-btn-${milestone.id}`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${milestone.setPiece} · ${milestone.date} · ${milestone.title[lang]}`}
                                aria-pressed={isSelected}
                                onClick={() => onSelectMilestone(milestone)}
                                onPointerEnter={() => hoverMilestone(milestone.id)}
                                onPointerLeave={() => hoverMilestone(null)}
                                onFocus={() => setFocusedMilestoneId(milestone.id)}
                                onBlur={() => setFocusedMilestoneId(null)}
                                onKeyDown={(e) => handleKeyDown(e, idx)}
                                style={{ cursor: 'pointer', outline: 'none' }}
                                className={clsx(
                                    isCurrent && 'text-white',
                                    isDone && !isCurrent && 'text-white dark:text-black',
                                    !isDone && !isCurrent && 'text-navy dark:text-navy-tint'
                                )}
                            >
                                <circle
                                    cx="0"
                                    cy="0"
                                    r="22"
                                    strokeWidth={!isDone && !isCurrent ? 2 : 0}
                                    strokeDasharray={!isDone && !isCurrent ? '4 3' : undefined}
                                    className={clsx(
                                        isCurrent && 'fill-crimson',
                                        isDone && !isCurrent && 'fill-navy dark:fill-navy-tint',
                                        !isDone && !isCurrent && 'fill-surface-page stroke-navy/40 dark:stroke-navy-tint/40',
                                        isHovered && !isCurrent && isDone && 'brightness-110'
                                    )}
                                />
                                <SetPieceIcon piece={milestone.setPiece} x={-8} y={-8} width={16} height={16} />
                            </g>

                            {/* Hover/Focus Tooltip Pill (Clamped strictly within active viewBox bounds) */}
                            {(isHovered || isSelected) && (() => {
                                const label = `${milestone.date} · ${milestone.title[lang]}`;
                                const pillW = Math.min(Math.max(label.length * 6.4 + 24, 80), isDesktop ? 420 : 380);
                                const fieldW = isDesktop ? 1000 : 440;

                                // Horizontal clamp inside field width with 8px margin
                                const minDx = 8 - (pos.x - pillW / 2);
                                const maxDx = fieldW - 8 - (pos.x + pillW / 2);
                                const dx = Math.min(Math.max(0, minDx), maxDx);

                                // Vertical placement clamp:
                                // Desktop viewBox y in [0, 480]: place below if pos.y < 60
                                // Mobile cropped viewBox y in [240, 840]: place below if pos.y < 300, above otherwise
                                const placeBelow = isDesktop ? pos.y < 60 : pos.y < 300;
                                const dy = placeBelow ? 32 : -32;

                                return (
                                    <g
                                        transform={`translate(${dx.toFixed(1)}, ${dy})`}
                                        className="pointer-events-none"
                                    >
                                        <rect
                                            x={-pillW / 2}
                                            y="-13"
                                            width={pillW}
                                            height="24"
                                            rx="6"
                                            fill="#0D1B2A"
                                            stroke="rgba(255,255,255,0.2)"
                                            strokeWidth="1"
                                        />
                                        <text
                                            x="0"
                                            y="3"
                                            textAnchor="middle"
                                            fill="#FFFFFF"
                                            fontSize="11"
                                            fontWeight="600"
                                            fontFamily="Inter, sans-serif"
                                        >
                                            {label}
                                        </text>
                                    </g>
                                );
                            })()}
                        </g>
                    );
                })}

                {/* ---------------------------------------------------------- */}
                {/* 5. Rugby Ball (at current milestone with rotate <= 15°)     */}
                {/* ---------------------------------------------------------- */}
                <g
                    transform={`translate(${ballPos.x.toFixed(1)}, ${ballPos.y.toFixed(1)})`}
                    className="pointer-events-none"
                    role="img"
                    aria-label={tJourney('field.ballAria', { title: milestones[currentMilestoneIndex]?.title[lang] || '' })}
                >
                    <g
                        transform={`rotate(${ballRotation.toFixed(1)})`}
                        className={clsx(
                            !prefersReducedMotion && 'motion-safe:transition-transform motion-safe:duration-200 ease-out'
                        )}
                    >
                        {/* Upright ball offset slightly above milestone icon */}
                        <g
                            transform="translate(0, -22)"
                            className={clsx(
                                !hasAnimatedBall && !prefersReducedMotion && 'motion-safe:animate-fade-in'
                            )}
                        >
                            <RugbyBallSVG x={-16} y={-10} width={32} height={20} className="drop-shadow-md" />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    );
}
