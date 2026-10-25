/**
 * Camera presets and pinhole perspective projection for the calm background pitch.
 * NO Three.js imports here. Pure TypeScript math only so both Three.js and SVG
 * can project identical coordinates.
 *
 * Pitch coordinates (metres):
 *   x along length: 0 = our dead-ball, 10 = our try line, 60 = halfway, 110 = far try line, 120 = far dead-ball
 *   z across width: 0 = near touchline, 35 = centre, 70 = far touchline
 *
 * Mapped to 3D world as (x, y, -z).
 */

export type BgCameraPreset = 'bgSideline' | 'bgBehindPosts' | 'authPanel';

export interface BgCameraParameters {
    preset: BgCameraPreset;
    worldPosition: { x: number; y: number; z: number };
    worldTarget: { x: number; y: number; z: number };
    worldUp: { x: number; y: number; z: number };
    verticalFov: number;
    fullWidth: number;
    fullHeight: number;
    viewBox: string;
}

export interface ProjectedBgPoint {
    x: number;
    y: number;
    depthScale: number;
    distance: number;
}

export const BG_CAMERA_PRESETS: Record<BgCameraPreset, BgCameraParameters> = {
    // Desktop (>= lg): low sideline view filling lower ~60% of viewport
    bgSideline: {
        preset: 'bgSideline',
        worldPosition: { x: 60, y: 36, z: 24 },
        worldTarget: { x: 60, y: 4, z: -38 },
        worldUp: { x: 0, y: 1, z: 0 },
        verticalFov: 50,
        fullWidth: 1440,
        fullHeight: 900,
        viewBox: '0 0 1440 900',
    },
    // Phones (< lg): low behind-the-posts view filling lower ~60% of viewport
    bgBehindPosts: {
        preset: 'bgBehindPosts',
        worldPosition: { x: -18, y: 72, z: -35 },
        worldTarget: { x: 75, y: 8, z: -35 },
        worldUp: { x: 0, y: 1, z: 0 },
        verticalFov: 68,
        fullWidth: 390,
        fullHeight: 844,
        viewBox: '0 0 390 844',
    },
    // Auth right-hand panel (desktop portrait column): tall behind-the-posts framing
    authPanel: {
        preset: 'authPanel',
        worldPosition: { x: -18, y: 72, z: -35 },
        worldTarget: { x: 75, y: 8, z: -35 },
        worldUp: { x: 0, y: 1, z: 0 },
        verticalFov: 68,
        fullWidth: 600,
        fullHeight: 900,
        viewBox: '0 0 600 900',
    },
};

/**
 * Projects a 3D world coordinate (wx, wy, wz in metres) into SVG viewBox coordinates.
 */
export function projectBg3DPoint(wx: number, wy: number, wz: number, preset: BgCameraPreset): ProjectedBgPoint {
    const cam = BG_CAMERA_PRESETS[preset];

    // Camera basis vectors
    const Fx = cam.worldTarget.x - cam.worldPosition.x;
    const Fy = cam.worldTarget.y - cam.worldPosition.y;
    const Fz = cam.worldTarget.z - cam.worldPosition.z;
    const lenF = Math.hypot(Fx, Fy, Fz);
    const fx = Fx / lenF;
    const fy = Fy / lenF;
    const fz = Fz / lenF;

    // Up vector is (0, 1, 0)
    const Ux = cam.worldUp.x;
    const Uy = cam.worldUp.y;
    const Uz = cam.worldUp.z;

    // Right = normalize(F x U)
    const Rx = fy * Uz - fz * Uy;
    const Ry = fz * Ux - fx * Uz;
    const Rz = fx * Uy - fy * Ux;
    const lenR = Math.hypot(Rx, Ry, Rz);
    const rx = Rx / lenR;
    const ry = Ry / lenR;
    const rz = Rz / lenR;

    // True Up = R x F
    const ux = ry * fz - rz * fy;
    const uy = rz * fx - rx * fz;
    const uz = rx * fy - ry * fx;

    // Displacement from camera
    const dx = wx - cam.worldPosition.x;
    const dy = wy - cam.worldPosition.y;
    const dz = wz - cam.worldPosition.z;

    // Camera space
    const xc = dx * rx + dy * ry + dz * rz;
    const yc = dx * ux + dy * uy + dz * uz;
    const d = dx * fx + dy * fy + dz * fz;

    const fovRad = (cam.verticalFov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const aspect = cam.fullWidth / cam.fullHeight;

    const x_ndc = xc / (d * tanHalfFov * aspect);
    const y_ndc = yc / (d * tanHalfFov);

    const x_full = (x_ndc + 1) * 0.5 * cam.fullWidth;
    const y_full = (1 - y_ndc) * 0.5 * cam.fullHeight;

    return {
        x: x_full,
        y: y_full,
        depthScale: 60 / d,
        distance: d,
    };
}

/**
 * Projects pitch ground coordinates (px, pz in metres) into SVG viewBox coordinates.
 */
export function projectBgPoint(px: number, pz: number, preset: BgCameraPreset): ProjectedBgPoint {
    return projectBg3DPoint(px, 0, -pz, preset);
}

// ----------------------------------------------------------------------
// 3D Goal Posts (H-Posts) Specifications
// ----------------------------------------------------------------------
export interface PostLineSegment {
    id: string;
    part: 'pad' | 'upright' | 'crossbar';
    p1: { x: number; y: number; z: number };
    p2: { x: number; y: number; z: number };
}

export function getPostStructures(): PostLineSegment[] {
    const segments: PostLineSegment[] = [];
    const tryLinesX = [10, 110]; // our try line (10) and far try line (110)
    const centreZ = -35;         // pitch z = 35 -> world z = -35
    const halfWidth = 2.8;       // 5.6 m upright spacing -> +/- 2.8 m
    const crossbarY = 3.0;
    const totalHeight = 16.0;
    const padHeight = 2.0;

    for (const x of tryLinesX) {
        const prefix = x === 10 ? 'our-post' : 'far-post';
        const z1 = centreZ + halfWidth; // -32.2
        const z2 = centreZ - halfWidth; // -37.8

        // Left upright: Pad (0 to 2m)
        segments.push({
            id: `${prefix}-left-pad`,
            part: 'pad',
            p1: { x, y: 0, z: z1 },
            p2: { x, y: padHeight, z: z1 },
        });
        // Left upright: Shaft (2m to 16m)
        segments.push({
            id: `${prefix}-left-shaft`,
            part: 'upright',
            p1: { x, y: padHeight, z: z1 },
            p2: { x, y: totalHeight, z: z1 },
        });

        // Right upright: Pad (0 to 2m)
        segments.push({
            id: `${prefix}-right-pad`,
            part: 'pad',
            p1: { x, y: 0, z: z2 },
            p2: { x, y: padHeight, z: z2 },
        });
        // Right upright: Shaft (2m to 16m)
        segments.push({
            id: `${prefix}-right-shaft`,
            part: 'upright',
            p1: { x, y: padHeight, z: z2 },
            p2: { x, y: totalHeight, z: z2 },
        });

        // Crossbar at 3m
        segments.push({
            id: `${prefix}-crossbar`,
            part: 'crossbar',
            p1: { x, y: crossbarY, z: z1 },
            p2: { x, y: crossbarY, z: z2 },
        });
    }

    return segments;
}

// ----------------------------------------------------------------------
// 3D Sideline Benches & Officials' Table Specifications
// ----------------------------------------------------------------------
export interface BenchLineSegment {
    id: string;
    p1: { x: number; y: number; z: number };
    p2: { x: number; y: number; z: number };
}

export function getBenchStructures(): BenchLineSegment[] {
    const segments: BenchLineSegment[] = [];
    const benchZ = 1.6; // near touchline in world space (pitch z = -1.6)

    // Team Bench 1 (x = 45, width 8m: x from 41 to 49)
    // Team Bench 2 (x = 75, width 8m: x from 71 to 79)
    const benches = [
        { id: 'bench-team1', x1: 41, x2: 49 },
        { id: 'bench-team2', x1: 71, x2: 79 },
    ];

    for (const b of benches) {
        // Seat horizontal bar (y = 0.5)
        segments.push({
            id: `${b.id}-seat`,
            p1: { x: b.x1, y: 0.5, z: benchZ },
            p2: { x: b.x2, y: 0.5, z: benchZ },
        });
        // Canopy roof bar (y = 1.8)
        segments.push({
            id: `${b.id}-roof`,
            p1: { x: b.x1, y: 1.8, z: benchZ },
            p2: { x: b.x2, y: 1.8, z: benchZ },
        });
        // Left upright
        segments.push({
            id: `${b.id}-left-up`,
            p1: { x: b.x1, y: 0, z: benchZ },
            p2: { x: b.x1, y: 1.8, z: benchZ },
        });
        // Right upright
        segments.push({
            id: `${b.id}-right-up`,
            p1: { x: b.x2, y: 0, z: benchZ },
            p2: { x: b.x2, y: 1.8, z: benchZ },
        });
    }

    // Officials' Table at halfway (x = 60, width 3m: x from 58.5 to 61.5, height 1.0m)
    segments.push({
        id: 'table-top',
        p1: { x: 58.5, y: 1.0, z: benchZ },
        p2: { x: 61.5, y: 1.0, z: benchZ },
    });
    segments.push({
        id: 'table-left-leg',
        p1: { x: 58.5, y: 0, z: benchZ },
        p2: { x: 58.5, y: 1.0, z: benchZ },
    });
    segments.push({
        id: 'table-right-leg',
        p1: { x: 61.5, y: 0, z: benchZ },
        p2: { x: 61.5, y: 1.0, z: benchZ },
    });

    return segments;
}

/**
 * Dev-only assertions confirming projection validity.
 */
export function runDevBgFieldAssertions(): void {
    if (!import.meta.env.DEV) return;

    // Check sideline: far touchline is higher (lower y) than near touchline
    const sideNear = projectBgPoint(60, 0, 'bgSideline');
    const sideFar = projectBgPoint(60, 70, 'bgSideline');
    console.assert(
        sideFar.y < sideNear.y,
        `[BgProjection] Sideline: far touchline (${sideFar.y.toFixed(1)}) must be above near touchline (${sideNear.y.toFixed(1)})`
    );

    // Check behindPosts: far try line is higher (lower y) than our try line
    const postNearTry = projectBgPoint(10, 35, 'bgBehindPosts');
    const postFarTry = projectBgPoint(110, 35, 'bgBehindPosts');
    console.assert(
        postFarTry.y < postNearTry.y,
        `[BgProjection] BehindPosts: far try (${postFarTry.y.toFixed(1)}) must be higher on screen than our try (${postNearTry.y.toFixed(1)})`
    );
}
