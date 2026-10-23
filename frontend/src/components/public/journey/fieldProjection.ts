/**
 * Shared perspective camera model & rugby pitch geometry in metres.
 * Pitch coordinates (metres):
 *   x along length: 0 = our dead-ball, 10 = our try line, 60 = halfway, 110 = far try line, 120 = far dead-ball line
 *   z across width: 0 = near touchline, 35 = centre / posts, 70 = far touchline
 *
 * Mapped to 3D world coordinates as (x, 0, -z) everywhere so that our try line (x=10)
 * is on screen-left in the sideline view.
 *
 * NO Three.js imports here. Pure TypeScript math only.
 */

export type CameraPreset = 'sideline' | 'behindPosts';

export interface CameraParameters {
    preset: CameraPreset;
    // Pitch coordinates in metres
    pitchPosition: { x: number; y: number; z: number };
    pitchTarget: { x: number; y: number; z: number };
    // World coordinates in metres (with z -> -z mapping)
    worldPosition: { x: number; y: number; z: number };
    worldTarget: { x: number; y: number; z: number };
    worldUp: { x: number; y: number; z: number };
    verticalFov: number;
    // Frame and crop
    fullWidth: number;
    fullHeight: number;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    viewBox: string;
}

export interface ProjectedPoint {
    x: number;
    y: number;
    depthScale: number;
    distance: number;
}

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
// Camera Presets
// ----------------------------------------------------------------------
export const CAMERA_PRESETS: Record<CameraPreset, CameraParameters> = {
    sideline: {
        preset: 'sideline',
        pitchPosition: { x: 60, y: 64, z: -5 },
        pitchTarget: { x: 60, y: 0, z: 30 },
        worldPosition: { x: 60, y: 64, z: 5 },
        worldTarget: { x: 60, y: 0, z: -30 },
        worldUp: { x: 0, y: 1, z: 0 },
        verticalFov: 56,
        fullWidth: 1000,
        fullHeight: 480,
        cropX: 0,
        cropY: 0,
        cropWidth: 1000,
        cropHeight: 480,
        viewBox: '0 0 1000 480',
    },
    behindPosts: {
        preset: 'behindPosts',
        pitchPosition: { x: -5, y: 118, z: 35 },
        pitchTarget: { x: 65, y: 0, z: 35 },
        worldPosition: { x: -5, y: 118, z: -35 },
        worldTarget: { x: 65, y: 0, z: -35 },
        worldUp: { x: 0, y: 1, z: 0 },
        verticalFov: 76,
        fullWidth: 440,
        fullHeight: 960,
        cropX: 0,
        cropY: 240,
        cropWidth: 440,
        cropHeight: 600,
        viewBox: '0 240 440 600',
    },
};

// ----------------------------------------------------------------------
// Pinhole Perspective Projection
// ----------------------------------------------------------------------
/**
 * Projects a ground coordinate (x, z in pitch metres) to SVG viewBox coordinates.
 */
export function project(px: number, pz: number, preset: CameraPreset): ProjectedPoint {
    const cam = CAMERA_PRESETS[preset];
    const P = { x: px, y: 0, z: -pz };

    // Camera basis vectors
    const Fx = cam.worldTarget.x - cam.worldPosition.x;
    const Fy = cam.worldTarget.y - cam.worldPosition.y;
    const Fz = cam.worldTarget.z - cam.worldPosition.z;
    const lenF = Math.hypot(Fx, Fy, Fz);
    const fx = Fx / lenF;
    const fy = Fy / lenF;
    const fz = Fz / lenF;

    // Up vector is (0, 1, 0)
    const Ux = 0;
    const Uy = 1;
    const Uz = 0;

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
    const dx = P.x - cam.worldPosition.x;
    const dy = P.y - cam.worldPosition.y;
    const dz = P.z - cam.worldPosition.z;

    // Camera space
    const xc = dx * rx + dy * ry + dz * rz;
    const yc = dx * ux + dy * uy + dz * uz;
    const d = dx * fx + dy * fy + dz * fz; // distance along optical axis

    const fovRad = (cam.verticalFov * Math.PI) / 180;
    const tanHalfFov = Math.tan(fovRad / 2);
    const aspect = cam.fullWidth / cam.fullHeight;

    const x_ndc = xc / (d * tanHalfFov * aspect);
    const y_ndc = yc / (d * tanHalfFov);

    // Full frame screen space
    const x_full = (x_ndc + 1) * 0.5 * cam.fullWidth;
    const y_full = (1 - y_ndc) * 0.5 * cam.fullHeight;

    // In SVG viewBox space (where origin matches full frame, but clipped to viewBox)
    return {
        x: x_full,
        y: y_full,
        depthScale: 60 / d,
        distance: d,
    };
}

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
// Dense Weaving Route Generation (Shared by SVG & Ball)
// ----------------------------------------------------------------------
export interface RouteData {
    samples: { x: number; y: number; gx: number; gz: number }[];
    milestonePoints: {
        x: number;
        y: number;
        gx: number;
        gz: number;
        sampleIndex: number;
    }[];
    startPost: { x: number; y: number };
    goalPost: { x: number; y: number };
    pathD: string;
}

/**
 * Computes ground coordinates for the weaving route.
 * Formula:
 *   x(t) = 10 + t^1.2 * 100 m
 *   z(t) = 35 + sin(t * 6 * PI) * (16 * (1 - 0.3 * t)) m
 */
export function getRouteGroundPosition(t: number): { x: number; z: number } {
    const clampedT = Math.max(0, Math.min(1, t));
    const x = 10 + Math.pow(clampedT, 1.2) * 100;
    const amp = 16 * (1 - 0.3 * clampedT);
    const z = 35 + Math.sin(clampedT * Math.PI * 6) * amp;
    return { x, z };
}

/**
 * Generates the dense projected route and milestone positions.
 * The SVG path string, milestone anchors, and the ball travel all use these exact points.
 */
export function generateDenseRoute(milestoneCount: number, preset: CameraPreset): RouteData {
    const SAMPLE_COUNT = 300;
    const samples: { x: number; y: number; gx: number; gz: number }[] = [];

    for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const t = i / SAMPLE_COUNT;
        const { x: gx, z: gz } = getRouteGroundPosition(t);
        const proj = project(gx, gz, preset);
        samples.push({
            x: proj.x,
            y: proj.y,
            gx,
            gz,
        });
    }

    // Milestone positions
    const milestonePoints = [];
    for (let m = 0; m < milestoneCount; m++) {
        const t = milestoneCount <= 1 ? 0.5 : m / (milestoneCount - 1);
        const sampleIndex = Math.round(t * SAMPLE_COUNT);
        const sample = samples[sampleIndex];
        milestonePoints.push({
            x: sample.x,
            y: sample.y,
            gx: sample.gx,
            gz: sample.gz,
            sampleIndex,
        });
    }

    // Start post (our try line centre: 10, 35) & Goal post (far try line centre: 110, 35)
    const startProj = project(10, 35, preset);
    const goalProj = project(110, 35, preset);
    const startPost = { x: startProj.x, y: startProj.y };
    const goalPost = { x: goalProj.x, y: goalProj.y };

    // Build SVG path data connecting start post -> dense samples -> goal post
    let pathD = `M ${startPost.x.toFixed(2)} ${startPost.y.toFixed(2)}`;
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
        const s = samples[i];
        pathD += ` L ${s.x.toFixed(2)} ${s.y.toFixed(2)}`;
    }
    pathD += ` L ${goalPost.x.toFixed(2)} ${goalPost.y.toFixed(2)}`;

    return {
        samples,
        milestonePoints,
        startPost,
        goalPost,
        pathD,
    };
}

// ----------------------------------------------------------------------
// Dev-only Verifications & Fit Checks
// ----------------------------------------------------------------------
export function runDevFieldAssertions(): void {
    if (!import.meta.env.DEV) return;

    // 1. Orientation asserts
    const sideNearTry = project(10, 35, 'sideline');
    const sideFarTry = project(110, 35, 'sideline');
    console.assert(
        sideNearTry.x < sideFarTry.x,
        `Sideline: our try line (${sideNearTry.x.toFixed(1)}) must be screen-left of far try line (${sideFarTry.x.toFixed(1)})`
    );

    const postsNearTry = project(10, 35, 'behindPosts');
    const postsFarTry = project(110, 35, 'behindPosts');
    console.assert(
        postsNearTry.y > postsFarTry.y,
        `BehindPosts: our try line (${postsNearTry.y.toFixed(1)}) must be closer/lower than far try line (${postsFarTry.y.toFixed(1)})`
    );

    // 2. Corner Points & Perspective Ratios
    const corners = [
        { name: 'ourDeadNear', x: 0, z: 0 },
        { name: 'farDeadNear', x: 120, z: 0 },
        { name: 'farDeadFar', x: 120, z: 70 },
        { name: 'ourDeadFar', x: 0, z: 70 },
    ];

    const sideCorners = corners.map((c) => ({ name: c.name, ...project(c.x, c.z, 'sideline') }));
    const sideNearW = Math.abs(sideCorners[1].x - sideCorners[0].x);
    const sideFarW = Math.abs(sideCorners[2].x - sideCorners[3].x);
    const sideRatio = sideFarW / sideNearW;

    const postCorners = corners.map((c) => ({ name: c.name, ...project(c.x, c.z, 'behindPosts') }));
    const postNearTryW = Math.abs(project(10, 70, 'behindPosts').x - project(10, 0, 'behindPosts').x);
    const postFarTryW = Math.abs(project(110, 70, 'behindPosts').x - project(110, 0, 'behindPosts').x);
    const postRatio = postFarTryW / postNearTryW;

    console.info('[FieldProjection] Sideline corners:', sideCorners.map((c) => `${c.name}: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`).join(', '));
    console.info(`[FieldProjection] Sideline perspective ratio: ${(sideRatio * 100).toFixed(1)}%`);
    console.info('[FieldProjection] BehindPosts corners:', postCorners.map((c) => `${c.name}: (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`).join(', '));
    console.info(`[FieldProjection] BehindPosts perspective ratio: ${(postRatio * 100).toFixed(1)}%`);

    // 3. Consecutive milestone gap check (>= 48 viewBox units for 13 and 10 milestones)
    for (const count of [13, 10]) {
        for (const preset of ['sideline', 'behindPosts'] as const) {
            const route = generateDenseRoute(count, preset);
            let minGap = Infinity;
            for (let i = 1; i < route.milestonePoints.length; i++) {
                const p0 = route.milestonePoints[i - 1];
                const p1 = route.milestonePoints[i];
                const gap = Math.hypot(p1.x - p0.x, p1.y - p0.y);
                if (gap < minGap) minGap = gap;
            }
            console.assert(
                minGap >= 48,
                `Milestone gap check failed for count=${count}, preset=${preset}: minGap = ${minGap.toFixed(1)} < 48`
            );
            console.info(`[FieldProjection] Min gap (milestones=${count}, ${preset}): ${minGap.toFixed(1)} viewBox units`);
        }
    }
}
