import React, { useMemo } from 'react';
import { getPitchMarkingLines } from '@/components/public/journey/fieldProjection';
import {
    BG_CAMERA_PRESETS,
    projectBgPoint,
    projectBg3DPoint,
    getPostStructures,
    getBenchStructures,
    type BgCameraPreset,
} from './backgroundProjection';
import clsx from 'clsx';

export interface PitchBackdropSvgProps {
    preset?: BgCameraPreset;
    isAuthPanel?: boolean;
    visible?: boolean;
    className?: string;
}

export const PitchBackdropSvg: React.FC<PitchBackdropSvgProps> = ({
    preset,
    isAuthPanel = false,
    visible = true,
    className,
}) => {
    // Determine preset based on prop or auth panel
    const activePreset: BgCameraPreset = preset
        ? preset
        : isAuthPanel
          ? 'authPanel'
          : 'bgSideline';

    const camParam = BG_CAMERA_PRESETS[activePreset];
    const lines = useMemo(() => getPitchMarkingLines(), []);
    const posts = useMemo(() => getPostStructures(), []);
    const benches = useMemo(() => getBenchStructures(), []);

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

    // Opacity classes based on budget:
    // Markings: ~22% light / ~30% dark; Auth panel: ~35%
    const baseOpacityClass = isAuthPanel
        ? 'opacity-[0.32] dark:opacity-[0.38]'
        : 'opacity-[0.22] dark:opacity-[0.30]';

    return (
        <svg
            viewBox={camParam.viewBox}
            preserveAspectRatio="xMidYMid slice"
            style={{
                WebkitMaskImage: 'linear-gradient(to top, black 72%, transparent 100%)',
                maskImage: 'linear-gradient(to top, black 72%, transparent 100%)',
            }}
            className={clsx(
                'w-full h-full block pointer-events-none select-none transition-opacity duration-[600ms]',
                visible ? baseOpacityClass : 'opacity-0',
                className
            )}
            aria-hidden="true"
        >
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
