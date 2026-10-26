/**
 * Shared rugby pitch geometry in metres and route calculation.
 * Pitch coordinates (metres):
 *   x along length: 0 = our dead-ball, 10 = our try line, 60 = halfway, 110 = far try line, 120 = far dead-ball line
 *   z across width: 0 = near touchline, 35 = centre / posts, 70 = far touchline
 *
 * Mapped to 3D world coordinates as (x, y, -z) everywhere so that our try line (x=10)
 * is on screen-left in the sideline view.
 *
 * Pure TypeScript math only.
 */

export interface GroundLine {
    id: string;
    type: 'solid' | 'dashed';
    x1: number;
    z1: number;
    x2: number;
    z2: number;
    isTryLine?: boolean;
}

// ----------------------------------------------------------------------
// Pitch Geometry Constants (metres)
// ----------------------------------------------------------------------
export const PITCH = {
    length: 120, // 0 = dead-ball, 10 = try, 110 = far try, 120 = far dead-ball
    width: 70,   // 0 = near touchline, 35 = centre, 70 = far touchline
    ourDeadBall: 0,
    ourTryLine: 10,
    our22m: 32,
    our10m: 50,
    halfway: 60,
    far10m: 70,
    far22m: 88,
    farTryLine: 110,
    farDeadBall: 120,
    centreZ: 35,
    dash5mNear: 5,
    dash15mNear: 15,
    dash15mFar: 55,
    dash5mFar: 65,
} as const;

// ----------------------------------------------------------------------
// Pitch Markings Definition (metres)
// ----------------------------------------------------------------------
export function getPitchMarkingLines(): GroundLine[] {
    const lines: GroundLine[] = [];

    // Perimeter (dead-ball & touchlines)
    lines.push({ id: 'touch-near', type: 'solid', x1: 0, z1: 0, x2: 120, z2: 0 });
    lines.push({ id: 'touch-far', type: 'solid', x1: 0, z1: 70, x2: 120, z2: 70 });
    lines.push({ id: 'dead-ball-near', type: 'solid', x1: 0, z1: 0, x2: 0, z2: 70 });
    lines.push({ id: 'dead-ball-far', type: 'solid', x1: 120, z1: 0, x2: 120, z2: 70 });

    // Try lines (Crimson emphasis)
    lines.push({ id: 'try-our', type: 'solid', x1: 10, z1: 0, x2: 10, z2: 70, isTryLine: true });
    lines.push({ id: 'try-far', type: 'solid', x1: 110, z1: 0, x2: 110, z2: 70, isTryLine: true });

    // 22m lines
    lines.push({ id: '22m-our', type: 'solid', x1: 32, z1: 0, x2: 32, z2: 70 });
    lines.push({ id: '22m-far', type: 'solid', x1: 88, z1: 0, x2: 88, z2: 70 });

    // Halfway line
    lines.push({ id: 'halfway', type: 'solid', x1: 60, z1: 0, x2: 60, z2: 70 });

    // 10m dashed lines
    lines.push({ id: '10m-dash-our', type: 'dashed', x1: 50, z1: 0, x2: 50, z2: 70 });
    lines.push({ id: '10m-dash-far', type: 'dashed', x1: 70, z1: 0, x2: 70, z2: 70 });

    // 5m and 15m dash lines along length (near touchline)
    lines.push({ id: '5m-dash-near', type: 'dashed', x1: 10, z1: 5, x2: 110, z2: 5 });
    lines.push({ id: '15m-dash-near', type: 'dashed', x1: 10, z1: 15, x2: 110, z2: 15 });

    // 5m and 15m dash lines along length (far touchline)
    lines.push({ id: '15m-dash-far', type: 'dashed', x1: 10, z1: 55, x2: 110, z2: 55 });
    lines.push({ id: '5m-dash-far', type: 'dashed', x1: 10, z1: 65, x2: 110, z2: 65 });

    return lines;
}

// ----------------------------------------------------------------------
// Route Calculation (Ground coordinates in metres)
// ----------------------------------------------------------------------
/**
 * Computes ground coordinates for the weaving route from our try line (10, 35)
 * to far try line (110, 35).
 * Formula:
 *   x(t) = 10 + t * 100 m
 *   z(t) = 35 + sin(t * 2 * PI * freq) * amp m
 * Ensures endpoints at t=0 and t=1 sit exactly at posts centre (z=35m).
 */
export function getRouteGroundPosition(
    t: number,
    customAmp = 26,
    customFreq = 2.5
): { x: number; z: number } {
    const clampedT = Math.max(0, Math.min(1, t));
    const x = 10 + clampedT * 100;
    const amp = customAmp * (1 - 0.2 * clampedT);
    const z = 35 + Math.sin(clampedT * Math.PI * 2 * customFreq) * amp;
    return { x, z };
}
