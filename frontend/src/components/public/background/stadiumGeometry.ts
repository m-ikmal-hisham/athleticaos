/**
 * Procedural geometry for a stylized 3D stadium bowl.
 * Inspired by National Stadium Bukit Jalil (elliptical bowl with signature toroidal/ring roof).
 * Generic naming throughout; no stadium name or logo anywhere in the UI.
 *
 * Pitch coordinate space (metres):
 *   Length: x in [0, 120] (pitch centre = 60, our dead-ball = 0, far dead-ball = 120)
 *   Width:  z in [0, -70] (pitch centre = -35, near touchline = 0, far touchline = -70)
 *   Ground: y = 0
 *
 * Real 400 m Athletics Track dimensions:
 *   Straights: 84.39 m length (half-length 42.195 m from pitch centre x = 60)
 *   Inner lane 1 radius: 36.5 m (half-width from pitch centre z = -35)
 *   8 lanes x 1.22 m lane width (lane 8 outer radius = 36.5 + 8 * 1.22 = 46.26 m)
 *   The 120 x 70 m rugby pitch sits centred inside this 400 m track ring.
 *
 * Stands (Oval Bowl):
 *   Starts ~3 m outside lane 8 (approx 91 m half-length x 49.5 m half-width from centre).
 *   Lower tier: rake ~31 deg, 10 seat rows.
 *   Upper tier: rake ~34 deg, 12 seat rows.
 *   Vomitory gaps: empty stair/aisle wedges every ~20 deg (18 vomitories).
 *
 * Signature Ring Roof:
 *   Outer compression ring over upper tier (~140 m x 93 m, height ~32 m).
 *   Inner tension ring over pitch perimeter (~82 m x 47 m, height ~36 m).
 *   Translucent annular canopy membrane, 72 radial cables, 72 inner floodlight points.
 *
 * Merged into 3 extra draw calls total:
 *   1. LineSegments (track lanes, tier rims, vomitory lines, roof rims and radial cables)
 *   2. Points (seat dots + inner floodlights)
 *   3. Mesh (translucent roof membrane)
 *
 * PURE TYPESCRIPT MATH: zero Three.js imports here so SVG and 3D share identical math.
 */

export interface StadiumGeometryData {
    lines: {
        positions: Float32Array; // 3 floats per vertex (p1, p2 for LineSegments)
        count: number;           // number of vertices
    };
    points: {
        positions: Float32Array; // 3 floats per vertex
        types: Float32Array;     // 1 float: 0 = seat, 1 = floodlight
        seeds: Float32Array;     // 1 float: random seed for shimmer
        count: number;
    };
    roofMesh: {
        positions: Float32Array;
        indices: Uint16Array;
        count: number;
    };
}

export interface StadiumSvgOutlines {
    trackInner: Array<{ x: number; y: number; z: number }>;
    trackOuter: Array<{ x: number; y: number; z: number }>;
    lowerTierFront: Array<{ x: number; y: number; z: number }>;
    lowerTierBack: Array<{ x: number; y: number; z: number }>;
    upperTierBack: Array<{ x: number; y: number; z: number }>;
    roofOuter: Array<{ x: number; y: number; z: number }>;
    roofInner: Array<{ x: number; y: number; z: number }>;
}

// Centre of pitch in world coordinates
const CX = 60.0;
const CZ = -35.0;

// Track parameters
const TRACK_STRAIGHT_HALF = 42.195; // 84.39 / 2
const TRACK_R1 = 36.5;              // inner lane 1 radius
const TRACK_LANE_WIDTH = 1.22;
const TRACK_LANES = 8;

/**
 * Calculates a point on the track perimeter given lane radius and parameter t in [0, 1].
 * t = 0 starts at (CX, CZ + R) on the near straight, goes counter-clockwise.
 */
function getTrackPoint(radius: number, t: number, y = 0.02): { x: number; y: number; z: number } {
    const straightLen = TRACK_STRAIGHT_HALF * 2;
    const curveLen = Math.PI * radius;
    const totalPerim = straightLen * 2 + curveLen * 2;

    const s = (t % 1.0) * totalPerim;

    // Segment 1: Near straight along X (x from CX - 42.195 to CX + 42.195, z = CZ + radius)
    if (s < straightLen) {
        const frac = s / straightLen;
        return {
            x: CX - TRACK_STRAIGHT_HALF + frac * straightLen,
            y,
            z: CZ + radius,
        };
    }
    // Segment 2: Far-end semicircular turn (center at CX + 42.195, CZ)
    const s2 = s - straightLen;
    if (s2 < curveLen) {
        const angle = -Math.PI / 2 + (s2 / curveLen) * Math.PI; // -pi/2 to pi/2
        return {
            x: CX + TRACK_STRAIGHT_HALF + radius * Math.cos(angle),
            y,
            z: CZ - radius * Math.sin(angle),
        };
    }
    // Segment 3: Far straight along X (x from CX + 42.195 down to CX - 42.195, z = CZ - radius)
    const s3 = s2 - curveLen;
    if (s3 < straightLen) {
        const frac = s3 / straightLen;
        return {
            x: CX + TRACK_STRAIGHT_HALF - frac * straightLen,
            y,
            z: CZ - radius,
        };
    }
    // Segment 4: Near-end semicircular turn (center at CX - 42.195, CZ)
    const s4 = s3 - straightLen;
    const angle = Math.PI / 2 + (s4 / curveLen) * Math.PI; // pi/2 to 3pi/2
    return {
        x: CX - TRACK_STRAIGHT_HALF + radius * Math.cos(angle),
        y,
        z: CZ - radius * Math.sin(angle),
    };
}

/**
 * Generates an elliptical stadium bowl point.
 */
function getBowlPoint(
    halfLength: number,
    halfWidth: number,
    angleRad: number,
    y: number
): { x: number; y: number; z: number } {
    return {
        x: CX + halfLength * Math.cos(angleRad),
        y,
        z: CZ + halfWidth * Math.sin(angleRad),
    };
}

/**
 * Checks if angle theta falls within a vomitory (aisle) gap.
 * 18 vomitory gaps every 20 deg (width ~3.5 deg).
 */
function isVomitoryGap(angleRad: number): boolean {
    const deg = (((angleRad * 180) / Math.PI) % 360 + 360) % 360;
    const mod20 = deg % 20;
    return mod20 < 1.8 || mod20 > 18.2;
}

export function buildStadiumGeometry(): StadiumGeometryData {
    const linePos: number[] = [];
    const pointPos: number[] = [];
    const pointType: number[] = [];
    const pointSeed: number[] = [];
    const roofPos: number[] = [];
    const roofIndices: number[] = [];

    // Helper: add line segment
    function addLine(p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }) {
        linePos.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    // -------------------------------------------------------------
    // 1. Athletics Track (8 lanes = 9 boundaries)
    // -------------------------------------------------------------
    const TRACK_STEPS = 64;
    for (let lane = 0; lane <= TRACK_LANES; lane++) {
        const radius = TRACK_R1 + lane * TRACK_LANE_WIDTH;
        for (let i = 0; i < TRACK_STEPS; i++) {
            const t1 = i / TRACK_STEPS;
            const t2 = (i + 1) / TRACK_STEPS;
            addLine(getTrackPoint(radius, t1), getTrackPoint(radius, t2));
        }
    }

    // -------------------------------------------------------------
    // 2. Stands Geometry (Bowl Tiers & Vomitories)
    // -------------------------------------------------------------
    // Stand dimensions starting ~3m outside lane 8 (approx 91m x 49.5m)
    const L_BASE_X = 91.0;
    const L_BASE_Z = 49.5;
    const L_BASE_Y = 0.5;

    // Lower tier top / concourse
    const L_TOP_X = 109.0;
    const L_TOP_Z = 65.5;
    const L_TOP_Y = 11.2;

    // Upper tier base
    const U_BASE_X = 113.0;
    const U_BASE_Z = 69.5;
    const U_BASE_Y = 12.0;

    // Upper tier top
    const U_TOP_X = 135.0;
    const U_TOP_Z = 89.5;
    const U_TOP_Y = 26.8;

    const BOWL_STEPS = 72; // every 5 degrees

    // Tier rim lines (lower base, lower top, upper base, upper top)
    const tierRims = [
        { hx: L_BASE_X, hz: L_BASE_Z, y: L_BASE_Y },
        { hx: L_TOP_X, hz: L_TOP_Z, y: L_TOP_Y },
        { hx: U_BASE_X, hz: U_BASE_Z, y: U_BASE_Y },
        { hx: U_TOP_X, hz: U_TOP_Z, y: U_TOP_Y },
    ];

    for (const rim of tierRims) {
        for (let i = 0; i < BOWL_STEPS; i++) {
            const a1 = (i * 2 * Math.PI) / BOWL_STEPS;
            const a2 = ((i + 1) * 2 * Math.PI) / BOWL_STEPS;
            addLine(getBowlPoint(rim.hx, rim.hz, a1, rim.y), getBowlPoint(rim.hx, rim.hz, a2, rim.y));
        }
    }

    // Vomitory radial lines (aisle boundary lines every 20 deg)
    for (let i = 0; i < 18; i++) {
        const centerDeg = i * 20;
        const leftRad = ((centerDeg - 1.8) * Math.PI) / 180;
        const rightRad = ((centerDeg + 1.8) * Math.PI) / 180;

        // Lower tier aisle edges
        addLine(getBowlPoint(L_BASE_X, L_BASE_Z, leftRad, L_BASE_Y), getBowlPoint(L_TOP_X, L_TOP_Z, leftRad, L_TOP_Y));
        addLine(getBowlPoint(L_BASE_X, L_BASE_Z, rightRad, L_BASE_Y), getBowlPoint(L_TOP_X, L_TOP_Z, rightRad, L_TOP_Y));

        // Upper tier aisle edges
        addLine(getBowlPoint(U_BASE_X, U_BASE_Z, leftRad, U_BASE_Y), getBowlPoint(U_TOP_X, U_TOP_Z, leftRad, U_TOP_Y));
        addLine(getBowlPoint(U_BASE_X, U_BASE_Z, rightRad, U_BASE_Y), getBowlPoint(U_TOP_X, U_TOP_Z, rightRad, U_TOP_Y));
    }

    // -------------------------------------------------------------
    // 3. Seat Dots (Points along lower and upper tiers)
    // -------------------------------------------------------------
    // Lower tier: 10 rows
    const LOWER_ROWS = 10;
    for (let r = 0; r < LOWER_ROWS; r++) {
        const frac = (r + 0.5) / LOWER_ROWS;
        const hx = L_BASE_X + frac * (L_TOP_X - L_BASE_X);
        const hz = L_BASE_Z + frac * (L_TOP_Z - L_BASE_Z);
        const y = L_BASE_Y + frac * (L_TOP_Y - L_BASE_Y);

        const rowSeats = Math.round(180 + frac * 60);
        for (let s = 0; s < rowSeats; s++) {
            const angle = (s * 2 * Math.PI) / rowSeats;
            if (isVomitoryGap(angle)) continue;

            const pt = getBowlPoint(hx, hz, angle, y);
            pointPos.push(pt.x, pt.y, pt.z);
            pointType.push(0.0); // 0 = seat
            pointSeed.push(Math.random());
        }
    }

    // Upper tier: 12 rows
    const UPPER_ROWS = 12;
    for (let r = 0; r < UPPER_ROWS; r++) {
        const frac = (r + 0.5) / UPPER_ROWS;
        const hx = U_BASE_X + frac * (U_TOP_X - U_BASE_X);
        const hz = U_BASE_Z + frac * (U_TOP_Z - U_BASE_Z);
        const y = U_BASE_Y + frac * (U_TOP_Y - U_BASE_Y);

        const rowSeats = Math.round(240 + frac * 80);
        for (let s = 0; s < rowSeats; s++) {
            const angle = (s * 2 * Math.PI) / rowSeats;
            if (isVomitoryGap(angle)) continue;

            const pt = getBowlPoint(hx, hz, angle, y);
            pointPos.push(pt.x, pt.y, pt.z);
            pointType.push(0.0); // 0 = seat
            pointSeed.push(Math.random());
        }
    }

    // -------------------------------------------------------------
    // 4. Signature Ring Roof (Canopy Mesh, Cables, Floodlights)
    // -------------------------------------------------------------
    const ROOF_OUTER_X = 140.0;
    const ROOF_OUTER_Z = 93.0;
    const ROOF_OUTER_Y = 32.0;

    const ROOF_INNER_X = 82.0;
    const ROOF_INNER_Z = 47.0;
    const ROOF_INNER_Y = 36.0;

    const ROOF_STEPS = 72; // every 5 degrees

    // Outer and Inner ring outline lines
    for (let i = 0; i < ROOF_STEPS; i++) {
        const a1 = (i * 2 * Math.PI) / ROOF_STEPS;
        const a2 = ((i + 1) * 2 * Math.PI) / ROOF_STEPS;

        // Outer compression ring line
        addLine(
            getBowlPoint(ROOF_OUTER_X, ROOF_OUTER_Z, a1, ROOF_OUTER_Y),
            getBowlPoint(ROOF_OUTER_X, ROOF_OUTER_Z, a2, ROOF_OUTER_Y)
        );
        // Inner tension ring line
        addLine(
            getBowlPoint(ROOF_INNER_X, ROOF_INNER_Z, a1, ROOF_INNER_Y),
            getBowlPoint(ROOF_INNER_X, ROOF_INNER_Z, a2, ROOF_INNER_Y)
        );

        // Radial cable line
        const pOuter = getBowlPoint(ROOF_OUTER_X, ROOF_OUTER_Z, a1, ROOF_OUTER_Y);
        const pInner = getBowlPoint(ROOF_INNER_X, ROOF_INNER_Z, a1, ROOF_INNER_Y);
        addLine(pOuter, pInner);

        // Inner roof floodlight point
        pointPos.push(pInner.x, pInner.y - 0.2, pInner.z);
        pointType.push(1.0); // 1 = floodlight
        pointSeed.push(1.0);
    }

    // Translucent Roof Membrane Mesh (Quad strip connecting outer and inner rims)
    for (let i = 0; i <= ROOF_STEPS; i++) {
        const angle = (i * 2 * Math.PI) / ROOF_STEPS;
        const pOuter = getBowlPoint(ROOF_OUTER_X, ROOF_OUTER_Z, angle, ROOF_OUTER_Y);
        const pInner = getBowlPoint(ROOF_INNER_X, ROOF_INNER_Z, angle, ROOF_INNER_Y);

        roofPos.push(pOuter.x, pOuter.y, pOuter.z);
        roofPos.push(pInner.x, pInner.y, pInner.z);
    }

    for (let i = 0; i < ROOF_STEPS; i++) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;

        roofIndices.push(v0, v1, v2);
        roofIndices.push(v1, v3, v2);
    }

    return {
        lines: {
            positions: new Float32Array(linePos),
            count: linePos.length / 3,
        },
        points: {
            positions: new Float32Array(pointPos),
            types: new Float32Array(pointType),
            seeds: new Float32Array(pointSeed),
            count: pointPos.length / 3,
        },
        roofMesh: {
            positions: new Float32Array(roofPos),
            indices: new Uint16Array(roofIndices),
            count: roofIndices.length,
        },
    };
}

/**
 * Returns simplified stadium 3D outline polylines for PitchBackdropSvg.
 */
export function getStadiumSvgOutlines(): StadiumSvgOutlines {
    const TRACK_STEPS = 48;
    const trackInner: Array<{ x: number; y: number; z: number }> = [];
    const trackOuter: Array<{ x: number; y: number; z: number }> = [];

    const outerRadius = TRACK_R1 + TRACK_LANES * TRACK_LANE_WIDTH;
    for (let i = 0; i <= TRACK_STEPS; i++) {
        const t = i / TRACK_STEPS;
        trackInner.push(getTrackPoint(TRACK_R1, t));
        trackOuter.push(getTrackPoint(outerRadius, t));
    }

    const BOWL_STEPS = 48;
    const lowerTierFront: Array<{ x: number; y: number; z: number }> = [];
    const lowerTierBack: Array<{ x: number; y: number; z: number }> = [];
    const upperTierBack: Array<{ x: number; y: number; z: number }> = [];
    const roofOuter: Array<{ x: number; y: number; z: number }> = [];
    const roofInner: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i <= BOWL_STEPS; i++) {
        const angle = (i * 2 * Math.PI) / BOWL_STEPS;
        lowerTierFront.push(getBowlPoint(91.0, 49.5, angle, 0.5));
        lowerTierBack.push(getBowlPoint(109.0, 65.5, angle, 11.2));
        upperTierBack.push(getBowlPoint(135.0, 89.5, angle, 26.8));
        roofOuter.push(getBowlPoint(140.0, 93.0, angle, 32.0));
        roofInner.push(getBowlPoint(82.0, 47.0, angle, 36.0));
    }

    return {
        trackInner,
        trackOuter,
        lowerTierFront,
        lowerTierBack,
        upperTierBack,
        roofOuter,
        roofInner,
    };
}
