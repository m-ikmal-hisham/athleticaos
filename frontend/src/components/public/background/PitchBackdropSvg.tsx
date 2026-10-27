import React, { useMemo, useState, useEffect } from 'react';
import { getPitchMarkingLines } from '@/components/public/journey/fieldProjection';
import {
    BG_CAMERA_PRESETS,
    projectBgPoint,
    projectBg3DPoint,
    getPostStructures,
    getBenchStructures,
    type BgCameraPreset,
} from './backgroundProjection';
import { getStadiumSvgOutlines } from './stadiumGeometry';
import clsx from 'clsx';

export interface PitchBackdropSvgProps {
    preset?: BgCameraPreset;
    visible?: boolean;
    /** Static routes behind long text/forms: much fainter backdrop */
    quiet?: boolean;
    className?: string;
}

function pointsToSvgPath(
    pts: Array<{ x: number; y: number; z: number }>,
    preset: BgCameraPreset,
    close = false
): string {
    if (pts.length === 0) return '';
    const d = pts
        .map((p, i) => {
            const projected = projectBg3DPoint(p.x, p.y, p.z, preset);
            const cmd = i === 0 ? 'M' : 'L';
            return `${cmd}${projected.x.toFixed(1)},${projected.y.toFixed(1)}`;
        })
        .join(' ');
    return close ? `${d} Z` : d;
}

export const PitchBackdropSvg: React.FC<PitchBackdropSvgProps> = ({
    preset,
    visible = true,
    quiet = false,
    className,
}) => {
    // Dynamic breakpoint tracking: bgStadiumSideline at >= 1024px, bgStadiumEnd below
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth >= 1024;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(min-width: 1024px)');
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    // Determine preset based on prop or breakpoint
    const activePreset: BgCameraPreset = preset
        ? preset
        : isDesktop
          ? 'bgStadiumSideline'
          : 'bgStadiumEnd';

    const camParam = BG_CAMERA_PRESETS[activePreset];
    const lines = useMemo(() => getPitchMarkingLines(), []);
    const posts = useMemo(() => getPostStructures(), []);
    const benches = useMemo(() => getBenchStructures(), []);
    const stadiumOutlines = useMemo(() => getStadiumSvgOutlines(), []);

    // Project pitch ground markings
    const projectedLines = useMemo(() => {
        return lines.map((line) => {
            const p1 = projectBgPoint(line.x1, line.z1, activePreset);
            const p2 = projectBgPoint(line.x2, line.z2, activePreset);
            return {
                id: line.id,
                type: line.type,
                isTryLine: Boolean(line.isTryLine),
                x1: p1.x.toFixed(1),
                y1: p1.y.toFixed(1),
                x2: p2.x.toFixed(1),
                y2: p2.y.toFixed(1),
            };
        });
    }, [lines, activePreset]);

    // Project 3D H-Posts
    const projectedPosts = useMemo(() => {
        return posts.map((post) => {
            const p1 = projectBg3DPoint(post.p1.x, post.p1.y, post.p1.z, activePreset);
            const p2 = projectBg3DPoint(post.p2.x, post.p2.y, post.p2.z, activePreset);
            return {
                id: post.id,
                part: post.part,
                x1: p1.x.toFixed(1),
                y1: p1.y.toFixed(1),
                x2: p2.x.toFixed(1),
                y2: p2.y.toFixed(1),
            };
        });
    }, [posts, activePreset]);

    // Project Sideline Benches & Officials' Table
    const projectedBenches = useMemo(() => {
        return benches.map((bench) => {
            const p1 = projectBg3DPoint(bench.p1.x, bench.p1.y, bench.p1.z, activePreset);
            const p2 = projectBg3DPoint(bench.p2.x, bench.p2.y, bench.p2.z, activePreset);
            return {
                id: bench.id,
                x1: p1.x.toFixed(1),
                y1: p1.y.toFixed(1),
                x2: p2.x.toFixed(1),
                y2: p2.y.toFixed(1),
            };
        });
    }, [benches, activePreset]);

    // Project Stadium outlines (track ring, lower/upper tiers, roof ring)
    const stadiumPaths = useMemo(() => {
        return {
            trackInner: pointsToSvgPath(stadiumOutlines.trackInner, activePreset, true),
            trackOuter: pointsToSvgPath(stadiumOutlines.trackOuter, activePreset, true),
            lowerTierFront: pointsToSvgPath(stadiumOutlines.lowerTierFront, activePreset, true),
            lowerTierBack: pointsToSvgPath(stadiumOutlines.lowerTierBack, activePreset, true),
            upperTierBack: pointsToSvgPath(stadiumOutlines.upperTierBack, activePreset, true),
            roofOuter: pointsToSvgPath(stadiumOutlines.roofOuter, activePreset, true),
            roofInner: pointsToSvgPath(stadiumOutlines.roofInner, activePreset, true),
        };
    }, [stadiumOutlines, activePreset]);

    // Opacity classes based on budget:
    // Markings: ~22% light / ~30% dark
    const baseOpacityClass = quiet
        ? 'opacity-[0.08] dark:opacity-[0.12]'
        : 'opacity-[0.22] dark:opacity-[0.30]';

    return (
        <svg
            id="pitch-backdrop-svg"
            viewBox={camParam.viewBox}
            preserveAspectRatio="xMidYMid slice"
            style={{
                WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
                maskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
            }}
            className={clsx(
                'w-full h-full block pointer-events-none select-none transition-opacity duration-[600ms]',
                visible ? baseOpacityClass : 'opacity-0',
                className
            )}
            aria-hidden="true"
        >
            {/* Simplified Stadium Outlines (400m Track, Tiers, Roof Ring) */}
            {stadiumPaths && (
                <g id="stadium-outlines" className="stroke-navy dark:stroke-navy-tint fill-none" strokeLinecap="round">
                    {/* Track 8-lane bounds */}
                    <path d={stadiumPaths.trackInner} strokeWidth="1.0" className="opacity-40" />
                    <path d={stadiumPaths.trackOuter} strokeWidth="1.2" className="opacity-50" />

                    {/* Bowl Tiers */}
                    <path d={stadiumPaths.lowerTierFront} strokeWidth="1.2" className="opacity-55" />
                    <path d={stadiumPaths.lowerTierBack} strokeWidth="1.2" className="opacity-55" />
                    <path d={stadiumPaths.upperTierBack} strokeWidth="1.4" className="opacity-65" />

                    {/* Signature Ring Roof */}
                    <path d={stadiumPaths.roofOuter} strokeWidth="1.8" className="opacity-75" />
                    <path d={stadiumPaths.roofInner} strokeWidth="1.8" className="opacity-80" />
                </g>
            )}

            {/* Ground pitch markings */}
            <g id="pitch-markings">
                {projectedLines.map((line) => {
                    const isTry = line.isTryLine;
                    const strokeClass = isTry
                        ? 'stroke-crimson dark:stroke-crimson-tint'
                        : 'stroke-navy dark:stroke-navy-tint';

                    return (
                        <line
                            key={line.id}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            className={strokeClass}
                            strokeWidth={isTry ? 3.0 : 1.8}
                            strokeDasharray={line.type === 'dashed' ? '8 8' : undefined}
                            strokeLinecap="round"
                        />
                    );
                })}
            </g>

            {/* Sideline Benches & Officials' Table (subtle outlines) */}
            <g id="sideline-benches" className="opacity-70 stroke-navy dark:stroke-navy-tint" strokeWidth="1.4" strokeLinecap="round">
                {projectedBenches.map((bench) => (
                    <line
                        key={bench.id}
                        x1={bench.x1}
                        y1={bench.y1}
                        x2={bench.x2}
                        y2={bench.y2}
                    />
                ))}
            </g>

            {/* 3D H-Posts: slim lines at ~45% opacity with crimson pads */}
            <g id="h-posts" className="opacity-[0.85]">
                {projectedPosts.map((post) => {
                    const isPad = post.part === 'pad';
                    const strokeClass = isPad
                        ? 'stroke-crimson dark:stroke-crimson-tint'
                        : 'stroke-navy dark:stroke-navy-tint';

                    return (
                        <line
                            key={post.id}
                            x1={post.x1}
                            y1={post.y1}
                            x2={post.x2}
                            y2={post.y2}
                            className={strokeClass}
                            strokeWidth={isPad ? 4.0 : 2.2}
                            strokeLinecap="round"
                        />
                    );
                })}
            </g>
        </svg>
    );
};
