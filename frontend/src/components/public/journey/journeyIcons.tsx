import React from 'react';
import type { SetPiece } from '@/content/journey';

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
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <path d="M4 18c3-6 9-10 16-10" />
                    <ellipse cx="18" cy="8" rx="3" ry="2" transform="rotate(-30 18 8)" fill="currentColor" />
                    <path d="M3 20l3-2-2-4" />
                </svg>
            );
        case 'phase':
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <path d="M7 6l6 6-6 6" />
                    <path d="M13 6l6 6-6 6" />
                </svg>
            );
        case 'scrum':
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
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <ellipse cx="12" cy="18" rx="4" ry="2.5" fill="currentColor" />
                    <path d="M6 14l6-6 6 6" />
                    <path d="M9 10l3-4 3 4" />
                </svg>
            );
        case 'maul':
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
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" x={x} y={y} width={width} height={height} className={className} aria-hidden="true">
                    <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2.5" />
                    <ellipse cx="12" cy="14" rx="4.5" ry="3" fill="currentColor" />
                    <path d="M12 4v4M6 6l3 3M18 6l-3 3" />
                </svg>
            );
        case 'conv':
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
            <ellipse cx="16" cy="10" rx="15" ry="9" fill="#8B4513" stroke="#4A2508" strokeWidth="1" />
            <path d="M1 10 C 10 3, 22 3, 31 10 C 22 17, 10 17, 1 10 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.85" />
            <line x1="16" y1="6" x2="16" y2="14" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="13" y1="7.5" x2="13" y2="12.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
            <line x1="19" y1="7.5" x2="19" y2="12.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
        </svg>
    );
}
