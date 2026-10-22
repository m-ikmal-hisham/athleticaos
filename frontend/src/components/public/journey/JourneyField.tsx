import React, { useId, useMemo, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import type { Journey, Milestone, SetPiece } from '@/content/journey';

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
    const [focusedMilestoneId, setFocusedMilestoneId] = useState<string | null>(null);
    // Hover in/out with a short grace period on leave, so the pointer sitting on a milestone's edge
    // (or moving between neighbouring milestones) doesn't toggle the highlight every frame.
    const leaveTimer = React.useRef<number | null>(null);
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

    // Compute milestone coordinates along a gentle S-curve route
    // Horizontal (desktop): 1000 x 480
    // Vertical (mobile): 440 x 960
    const coords = useMemo(() => {
        const count = milestones.length;
        return milestones.map((_, i) => {
            const t = count <= 1 ? 0.5 : i / (count - 1);
            if (isDesktop) {
                // X: Start posts at 110, Goal posts at 890. Milestones spread from 170 to 830.
                const x = 170 + t * (830 - 170);
                // Y: Gentle oscillation around centerline 240
                const y = 240 + Math.sin(t * Math.PI * 2.2) * 85;
                return { x, y };
            } else {
                // Y: Start posts at 110, Goal posts at 850. Milestones spread from 180 to 780.
                const y = 180 + t * (780 - 180);
                // X: Gentle oscillation around centerline 220
                const x = 220 + Math.sin(t * Math.PI * 2.2) * 90;
                return { x, y };
            }
        });
    }, [milestones, isDesktop]);

    // Start & Goal posts coordinates
    const startPosts = useMemo(() => {
        return isDesktop ? { x: 110, y: 240 } : { x: 220, y: 110 };
    }, [isDesktop]);

    const goalPosts = useMemo(() => {
        return isDesktop ? { x: 890, y: 240 } : { x: 220, y: 850 };
    }, [isDesktop]);

    // Build SVG path segments between milestones
    // 0: startPosts -> m[0]
    // i: m[i-1] -> m[i]
    // last: m[n-1] -> goalPosts
    const pathSegments = useMemo(() => {
        const segments: { path: string; fromIdx: number; toIdx: number }[] = [];
        if (coords.length === 0) return segments;

        // Start to first
        segments.push({
            path: `M ${startPosts.x} ${startPosts.y} Q ${(startPosts.x + coords[0].x) / 2} ${(startPosts.y + coords[0].y) / 2} ${coords[0].x} ${coords[0].y}`,
            fromIdx: -1,
            toIdx: 0,
        });

        // Between consecutive milestones
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[i];
            const p1 = coords[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            segments.push({
                path: `M ${p0.x} ${p0.y} Q ${midX} ${midY} ${p1.x} ${p1.y}`,
                fromIdx: i,
                toIdx: i + 1,
            });
        }

        // Last to goal
        const last = coords[coords.length - 1];
        segments.push({
            path: `M ${last.x} ${last.y} Q ${(last.x + goalPosts.x) / 2} ${(last.y + goalPosts.y) / 2} ${goalPosts.x} ${goalPosts.y}`,
            fromIdx: coords.length - 1,
            toIdx: coords.length,
        });

        return segments;
    }, [coords, startPosts, goalPosts]);

    // Current ball position
    const restPos = useMemo(() => {
        return coords[currentMilestoneIndex] || (isDesktop ? { x: 500, y: 240 } : { x: 220, y: 480 });
    }, [coords, currentMilestoneIndex, isDesktop]);

    // Ball travels once from our posts along the route to the current milestone (≤ 1.2 s).
    // requestAnimationFrame + linear interpolation, so no CSS offset-path is needed (works in all Safari versions).
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
        const startPost = isDesktop ? { x: 110, y: 240 } : { x: 220, y: 110 };
        const pts = [startPost, ...coords.slice(0, currentMilestoneIndex + 1)];
        const seg = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
        const total = seg.reduce((s, l) => s + l, 0);
        if (total === 0) return restPos;
        let d = travel * total;
        for (let i = 0; i < seg.length; i++) {
            if (d <= seg[i]) {
                const r = seg[i] === 0 ? 0 : d / seg[i];
                return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * r, y: pts[i].y + (pts[i + 1].y - pts[i].y) * r };
            }
            d -= seg[i];
        }
        return restPos;
    }, [travel, restPos, coords, currentMilestoneIndex, isDesktop]);

    // Ball rotation towards hovered milestone (≤ 15°, pass being lined up)
    const ballRotation = useMemo(() => {
        if (activeHoverIndex === null || activeHoverIndex === currentMilestoneIndex || prefersReducedMotion) {
            return 0;
        }
        const target = coords[activeHoverIndex];
        if (!target) return 0;
        const dx = target.x - ballPos.x;
        const dy = target.y - ballPos.y;
        let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
        // Normalize angle to within [-15, 15] degrees relative to direction
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
            // Programmatically focus next button
            const btn = document.getElementById(`milestone-btn-${nextMilestone.id}`);
            btn?.focus();
        }
    };

    const viewBox = isDesktop ? '0 0 1000 480' : '0 0 440 960';

    return (
        <div className="relative w-full overflow-hidden rounded-xl bg-surface-card border border-line-subtle shadow-sm select-none">
            {/* Background layer for Three.js D6b pitch background mounting */}
            <div data-journey-bg className="absolute inset-0 pointer-events-none z-0" aria-hidden="true" />

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
                {/* 1. Rugby Pitch Markings (Navy at low opacity ~0.14)        */}
                {/* ---------------------------------------------------------- */}
                <g className="text-navy dark:text-navy-tint stroke-current pointer-events-none" opacity="0.14">
                    {isDesktop ? (
                        <>
                            {/* Perimeter touchlines & dead-ball lines */}
                            <rect x="40" y="40" width="920" height="400" fill="none" strokeWidth="2" />
                            {/* Start try line (x=110) & Goal try line (x=890) */}
                            <line x1="110" y1="40" x2="110" y2="440" strokeWidth="3" />
                            <line x1="890" y1="40" x2="890" y2="440" strokeWidth="3" />
                            {/* 22m lines (x=270, x=730) */}
                            <line x1="270" y1="40" x2="270" y2="440" strokeWidth="1.5" />
                            <line x1="730" y1="40" x2="730" y2="440" strokeWidth="1.5" />
                            {/* Halfway line (x=500) */}
                            <line x1="500" y1="40" x2="500" y2="440" strokeWidth="2" />
                            {/* 10m dashed lines (x=430, x=570) */}
                            <line x1="430" y1="40" x2="430" y2="440" strokeWidth="1.5" strokeDasharray="6 6" />
                            <line x1="570" y1="40" x2="570" y2="440" strokeWidth="1.5" strokeDasharray="6 6" />
                            {/* Halfway center spot */}
                            <circle cx="500" cy="240" r="3" fill="currentColor" stroke="none" />
                        </>
                    ) : (
                        <>
                            {/* Perimeter touchlines & dead-ball lines */}
                            <rect x="30" y="40" width="380" height="880" fill="none" strokeWidth="2" />
                            {/* Start try line (y=110) & Goal try line (y=850) */}
                            <line x1="30" y1="110" x2="410" y2="110" strokeWidth="3" />
                            <line x1="30" y1="850" x2="410" y2="850" strokeWidth="3" />
                            {/* 22m lines (y=270, y=690) */}
                            <line x1="30" y1="270" x2="410" y2="270" strokeWidth="1.5" />
                            <line x1="30" y1="690" x2="410" y2="690" strokeWidth="1.5" />
                            {/* Halfway line (y=480) */}
                            <line x1="30" y1="480" x2="410" y2="480" strokeWidth="2" />
                            {/* 10m dashed lines (y=410, y=550) */}
                            <line x1="30" y1="410" x2="410" y2="410" strokeWidth="1.5" strokeDasharray="6 6" />
                            <line x1="30" y1="550" x2="410" y2="550" strokeWidth="1.5" strokeDasharray="6 6" />
                            {/* Halfway center spot */}
                            <circle cx="220" cy="480" r="3" fill="currentColor" stroke="none" />
                        </>
                    )}
                </g>

                {/* ---------------------------------------------------------- */}
                {/* 2. Goal Posts (Start Posts & Opposite Goal Posts)          */}
                {/* ---------------------------------------------------------- */}
                {/* Start posts (AthleticaOS Brand Mark) */}
                <g className="pointer-events-none" transform={`translate(${startPosts.x}, ${startPosts.y})`}>
                    {isDesktop ? (
                        <>
                            {/* Uprights & crossbar */}
                            <line x1="0" y1="-32" x2="0" y2="32" stroke="rgb(var(--brand))" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
                            <circle cx="0" cy="-28" r="3.5" fill="rgb(var(--brand))" />
                            <circle cx="0" cy="28" r="3.5" fill="rgb(var(--brand))" />
                            {/* Crossbar */}
                            <line x1="0" y1="-16" x2="0" y2="16" stroke="rgb(var(--brand))" strokeWidth="2" />
                            {/* AthleticaOS Mark Monogram badge */}
                            <g transform="translate(-48, -12)">
                                <rect width="36" height="24" rx="6" fill="rgb(var(--brand))" />
                                <text x="18" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800" fontFamily="Oswald, sans-serif">
                                    ATH
                                </text>
                            </g>
                        </>
                    ) : (
                        <>
                            {/* Vertical top posts */}
                            <line x1="-32" y1="0" x2="32" y2="0" stroke="rgb(var(--brand))" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
                            <circle cx="-28" cy="0" r="3.5" fill="rgb(var(--brand))" />
                            <circle cx="28" cy="0" r="3.5" fill="rgb(var(--brand))" />
                            <g transform="translate(-18, -32)">
                                <rect width="36" height="22" rx="6" fill="rgb(var(--brand))" />
                                <text x="18" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800" fontFamily="Oswald, sans-serif">
                                    ATH
                                </text>
                            </g>
                        </>
                    )}
                </g>

                {/* Goal posts (Opposite Try Line - Labelled with Journey Goal) */}
                <g className="pointer-events-none" transform={`translate(${goalPosts.x}, ${goalPosts.y})`}>
                    {isDesktop ? (
                        <>
                            <line x1="0" y1="-34" x2="0" y2="34" stroke="rgb(var(--brand))" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
                            <circle cx="0" cy="-30" r="3.5" fill="rgb(var(--brand))" />
                            <circle cx="0" cy="30" r="3.5" fill="rgb(var(--brand))" />
                            {/* Label card */}
                            <g transform="translate(10, -18)">
                                <rect width="56" height="36" rx="6" fill="rgb(var(--brand))" opacity="0.9" />
                                <text x="28" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
                                    TRY LINE
                                </text>
                                <text x="28" y="27" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="600" opacity="0.85">
                                    GOAL
                                </text>
                            </g>
                        </>
                    ) : (
                        <>
                            <line x1="-34" y1="0" x2="34" y2="0" stroke="rgb(var(--brand))" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
                            <circle cx="-30" cy="0" r="3.5" fill="rgb(var(--brand))" />
                            <circle cx="30" cy="0" r="3.5" fill="rgb(var(--brand))" />
                            <g transform="translate(-40, 10)">
                                <rect width="80" height="24" rx="6" fill="rgb(var(--brand))" opacity="0.9" />
                                <text x="40" y="15" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
                                    GOAL: {journey.goal[lang]}
                                </text>
                            </g>
                        </>
                    )}
                </g>

                {/* ---------------------------------------------------------- */}
                {/* 3. Curved Route Segments                                    */}
                {/* ---------------------------------------------------------- */}
                <g className="route-segments">
                    {pathSegments.map((seg, idx) => {
                        const isDone = seg.toIdx <= currentMilestoneIndex;
                        // Check if this segment connects to the active hover/focused milestone
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
                {/* 4. Milestones Buttons & Nodes                              */}
                {/* ---------------------------------------------------------- */}
                {milestones.map((milestone, idx) => {
                    const pos = coords[idx];
                    if (!pos) return null;
                    const isSelected = selectedMilestone.id === milestone.id;
                    const isHovered = focusedMilestoneId === milestone.id;
                    const isCurrent = milestone.status === 'current';
                    const isDone = milestone.status === 'done';

                    return (
                        <g key={milestone.id} transform={`translate(${pos.x}, ${pos.y})`}>
                            {/* LIVE Pulse on Current milestone */}
                            {isCurrent && (
                                <circle
                                    cx="0"
                                    cy="0"
                                    r="24"
                                    fill={`url(#current-pulse-${animId})`}
                                    className="motion-safe:animate-ping opacity-75"
                                    // Scale from the milestone's own centre: without fill-box the CSS scale runs from the
                                    // SVG origin, so the ring sweeps across the field (corner artefact + hover flicker)
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

                            {/* Milestone as a native SVG button (no foreignObject: Safari repaints/hit-tests HTML
                                inside SVG badly, which made hover flicker). role=button + tabIndex + Enter/Space. */}
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

                            {/* Hover/Focus Tooltip Pill (Date · Title) */}
                            {(isHovered || isSelected) && (() => {
                                // Size the pill to its label (~6.4 units per character at 11px Inter + padding)
                                // and keep it inside the field horizontally.
                                const label = `${milestone.date} · ${milestone.title[lang]}`;
                                const pillW = Math.min(Math.max(label.length * 6.4 + 24, 80), isDesktop ? 420 : 400);
                                const fieldW = isDesktop ? 1000 : 440;
                                const minDx = 8 - (pos.x - pillW / 2);
                                const maxDx = fieldW - 8 - (pos.x + pillW / 2);
                                const dx = Math.min(Math.max(0, minDx), maxDx);
                                return (
                                <g
                                    transform={`translate(${dx}, ${pos.y < 90 ? 32 : -32})`}
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
                    transform={`translate(${ballPos.x}, ${ballPos.y})`}
                    className="pointer-events-none"
                    role="img"
                    aria-label={tJourney('field.ballAria', { title: milestones[currentMilestoneIndex]?.title[lang] || '' })}
                >
                    <g
                        transform={`rotate(${ballRotation})`}
                        className={clsx(
                            !prefersReducedMotion && 'motion-safe:transition-transform motion-safe:duration-200 ease-out'
                        )}
                    >
                        {/* Offset ball slightly above milestone icon so both remain visible */}
                        <g
                            transform={isDesktop ? 'translate(0, -22)' : 'translate(22, 0)'}
                            className={clsx(
                                !hasAnimatedBall && !prefersReducedMotion && 'motion-safe:animate-fade-in'
                            )}
                        >
                            {/* Nested <svg> inside SVG needs explicit x/y/width/height (CSS w-/h- classes are ignored by Safari) */}
                            <RugbyBallSVG x={-16} y={-10} width={32} height={20} className="drop-shadow-md" />
                        </g>
                    </g>
                </g>
            </svg>
        </div>
    );
}
