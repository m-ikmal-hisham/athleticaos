import * as THREE from 'three';
import {
    CAMERA_PRESETS,
    getPitchMarkingLines,
    project,
    type CameraPreset,
} from './fieldProjection';
import type { AnimatedBgMode } from '@/config/animatedBackground';
import { createSharedEngine } from '@/components/public/background/engine/renderEngine';
import { readThemeColors } from '@/components/public/background/engine/themeColors';
import type { ThemeColors } from '@/components/public/background/engine/types';

export interface SceneController {
    resize: (isDesktop: boolean) => void;
    dispose: () => void;
}

// ----------------------------------------------------------------------
// Dev-only Three.js vs Math Projection Assertion
// ----------------------------------------------------------------------
function assertProjectionMatchesThree(camera: THREE.PerspectiveCamera, preset: CameraPreset): void {
    if (!import.meta.env.DEV) return;
    const corners = [
        [0, 0],
        [120, 0],
        [120, 70],
        [0, 70],
    ];
    for (const [x, z] of corners) {
        const mathPt = project(x, z, preset);
        const v = new THREE.Vector3(x, 0, -z).project(camera);
        let threeX = 0;
        let threeY = 0;
        if (preset === 'sideline') {
            threeX = (v.x + 1) * 0.5 * 1000;
            threeY = (1 - v.y) * 0.5 * 480;
        } else {
            // behindPosts viewOffset is at y=240 in 440x960 full frame
            threeX = (v.x + 1) * 0.5 * 440;
            threeY = 240 + (1 - v.y) * 0.5 * 600;
        }
        const diff = Math.hypot(mathPt.x - threeX, mathPt.y - threeY);
        console.assert(
            diff < 1.0,
            `[ThreeMatch] Projection divergence at (${x}, ${z}) for ${preset}: diff = ${diff.toFixed(3)} px`
        );
    }
}

// ----------------------------------------------------------------------
// Mount & Create Scene
// ----------------------------------------------------------------------
export function mountJourneyPitchScene(
    container: HTMLElement,
    fieldWrapper: HTMLElement,
    mode: AnimatedBgMode
): SceneController {
    let currentPreset: CameraPreset = window.innerWidth >= 1024 ? 'sideline' : 'behindPosts';

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    function createCamera(preset: CameraPreset): THREE.PerspectiveCamera {
        const camParam = CAMERA_PRESETS[preset];
        const cam = new THREE.PerspectiveCamera(
            camParam.verticalFov,
            camParam.fullWidth / camParam.fullHeight,
            0.5,
            500
        );
        if (preset === 'behindPosts') {
            cam.setViewOffset(440, 960, 0, 240, 440, 600);
        }
        cam.position.set(camParam.worldPosition.x, camParam.worldPosition.y, camParam.worldPosition.z);
        cam.up.set(camParam.worldUp.x, camParam.worldUp.y, camParam.worldUp.z);
        cam.lookAt(camParam.worldTarget.x, camParam.worldTarget.y, camParam.worldTarget.z);
        cam.updateMatrixWorld();
        cam.updateProjectionMatrix();

        assertProjectionMatchesThree(cam, preset);
        return cam;
    }

    let camera = createCamera(currentPreset);

    // 2. Particle Generation (Markings + Grass)
    const lines = getPitchMarkingLines();
    const particlePositions: number[] = [];
    const particleColors: number[] = [];
    const particleBasePos: number[] = [];
    const particleAlphas: number[] = [];
    const particleTypes: number[] = []; // 0 = markings, 1 = try line, 2 = grass

    let themeColors = readThemeColors();

    // Sample markings along lines (every 0.75m)
    for (const line of lines) {
        const dx = line.x2 - line.x1;
        const dz = line.z2 - line.z1;
        const len = Math.hypot(dx, dz);
        const steps = Math.max(2, Math.round(len / 0.75));
        const isTry = Boolean(line.isTryLine);

        for (let s = 0; s <= steps; s++) {
            if (line.type === 'dashed' && Math.floor(s / 3) % 2 === 1) {
                continue; // Skip dash intervals
            }
            const frac = s / steps;
            const gx = line.x1 + dx * frac;
            const gz = line.z1 + dz * frac;
            // Map pitch (x, z) to world (x, 0, -z)
            const wx = gx;
            const wy = 0;
            const wz = -gz;

            particlePositions.push(wx, wy, wz);
            particleBasePos.push(wx, wy, wz);

            const col = isTry ? themeColors.tryLine : themeColors.markings;
            particleColors.push(col[0], col[1], col[2]);
            particleAlphas.push(themeColors.markingsOpacity);
            particleTypes.push(isTry ? 1 : 0);
        }
    }

    // Sparse grass field across pitch (calm mode: fewer particles)
    const grassCount = mode === 'calm' ? 350 : 800;
    for (let i = 0; i < grassCount; i++) {
        // Jittered distribution across pitch 0..120 x 0..70
        const gx = Math.random() * 120;
        const gz = Math.random() * 70;
        const wx = gx;
        const wy = 0;
        const wz = -gz;

        particlePositions.push(wx, wy, wz);
        particleBasePos.push(wx, wy, wz);

        const col = themeColors.grass;
        particleColors.push(col[0], col[1], col[2]);
        particleAlphas.push(themeColors.grassOpacity);
        particleTypes.push(2);
    }

    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.Float32BufferAttribute(particlePositions, 3);
    const colAttr = new THREE.Float32BufferAttribute(particleColors, 3);
    const alphaAttr = new THREE.Float32BufferAttribute(particleAlphas, 1);
    geometry.setAttribute('position', posAttr);
    geometry.setAttribute('color', colAttr);
    geometry.setAttribute('alpha', alphaAttr);

    // Custom ShaderMaterial
    const vertexShader = `
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
            vColor = color;
            vAlpha = alpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            // Size attenuation with distance
            gl_PointSize = (14.0 / -mvPosition.z) * uPixelRatio;
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
            // Soft circular point
            vec2 coord = gl_PointCoord - vec2(0.5);
            float dist = length(coord);
            if (dist > 0.5) discard;
            float edge = smoothstep(0.5, 0.15, dist);
            gl_FragColor = vec4(vColor, vAlpha * edge);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
        },
    });

    const pointsMesh = new THREE.Points(geometry, material);
    scene.add(pointsMesh);

    // ------------------------------------------------------------------
    // Theme Update Handler
    // ------------------------------------------------------------------
    function updateThemeColors(newColors: ThemeColors) {
        themeColors = newColors;
        const colors = colAttr.array as Float32Array;
        const alphas = alphaAttr.array as Float32Array;

        for (let i = 0; i < particleTypes.length; i++) {
            const type = particleTypes[i];
            let c = themeColors.markings;
            let a = themeColors.markingsOpacity;
            if (type === 1) {
                c = themeColors.tryLine;
            } else if (type === 2) {
                c = themeColors.grass;
                a = themeColors.grassOpacity;
            }
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
            alphas[i] = a;
        }
        colAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
    }

    // ------------------------------------------------------------------
    // Pointer Hover Interaction: Raycast ground displacement
    // ------------------------------------------------------------------
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(-999, -999);
    let pointerOnField = false;

    // Displaced particles springs: index -> { ox, oz, startTime }
    const displacedParticles = new Map<number, { ox: number; oz: number; startTime: number }>();

    function onPointerMove(e: PointerEvent) {
        // Filter out clicks on interactive elements
        if ((e.target as Element | null)?.closest?.('[role="button"], button, a, input, select, textarea')) {
            pointerOnField = false;
            return;
        }
        const rect = engine.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        pointerOnField = true;
    }

    function onPointerLeave() {
        pointerOnField = false;
        pointerNDC.set(-999, -999);
    }

    // ------------------------------------------------------------------
    // Click Ball Arc & Spark Effect (single concurrent arc, <= 1s)
    // ------------------------------------------------------------------
    let activeArc: {
        startX: number;
        startZ: number;
        targetX: number;
        targetZ: number;
        startTime: number;
        duration: number;
        mesh: THREE.Points;
        geom: THREE.BufferGeometry;
    } | null = null;

    function onClick(e: MouseEvent) {
        if (mode === 'calm' || activeArc !== null) return;
        if ((e.target as Element | null)?.closest?.('[role="button"], button, a, input, select, textarea')) {
            return;
        }

        const rect = engine.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const hit = new THREE.Vector3();
        if (!raycaster.ray.intersectPlane(groundPlane, hit)) return;

        // Check if hit point is inside pitch bounds: x in [0, 120], z in [0, 70] (world z in [-70, 0])
        if (hit.x < 0 || hit.x > 120 || hit.z > 0 || hit.z < -70) {
            return;
        }

        // Spawn arc towards far try line centre: world (110, 0, -35)
        const SPARK_COUNT = 18;
        const sparkPos = new Float32Array(SPARK_COUNT * 3);
        const sparkCol = new Float32Array(SPARK_COUNT * 3);
        const crimson = themeColors.tryLine;

        for (let i = 0; i < SPARK_COUNT; i++) {
            sparkPos[i * 3] = hit.x;
            sparkPos[i * 3 + 1] = 0;
            sparkPos[i * 3 + 2] = hit.z;
            sparkCol[i * 3] = crimson[0];
            sparkCol[i * 3 + 1] = crimson[1];
            sparkCol[i * 3 + 2] = crimson[2];
        }

        const sparkGeom = new THREE.BufferGeometry();
        sparkGeom.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        sparkGeom.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));

        const sparkMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
            },
        });

        const arcPoints = new THREE.Points(sparkGeom, sparkMat);
        scene.add(arcPoints);

        activeArc = {
            startX: hit.x,
            startZ: hit.z,
            targetX: 110,
            targetZ: -35,
            startTime: performance.now(),
            duration: 850, // <= 1s
            mesh: arcPoints,
            geom: sparkGeom,
        };
    }

    fieldWrapper.addEventListener('pointermove', onPointerMove, { passive: true });
    fieldWrapper.addEventListener('pointerleave', onPointerLeave, { passive: true });
    fieldWrapper.addEventListener('click', onClick);

    // ------------------------------------------------------------------
    // Shared Engine Setup
    // ------------------------------------------------------------------
    const positions = posAttr.array as Float32Array;

    function renderFrame(now: number) {
        material.uniforms.uTime.value = now * 0.001;

        // 1. Camera sway (<= 1 deg), eased towards the pointer and back to rest when it leaves
        const camParam = CAMERA_PRESETS[currentPreset];
        const swayX = camParam.worldPosition.x + (pointerOnField ? pointerNDC.x * 0.8 : 0);
        const swayZ = camParam.worldPosition.z + (pointerOnField ? pointerNDC.y * 0.5 : 0);
        if (Math.abs(camera.position.x - swayX) > 0.001 || Math.abs(camera.position.z - swayZ) > 0.001) {
            camera.position.x += (swayX - camera.position.x) * 0.06;
            camera.position.z += (swayZ - camera.position.z) * 0.06;
            camera.lookAt(camParam.worldTarget.x, camParam.worldTarget.y, camParam.worldTarget.z);
        }

        // 2. Raycast hover push & spring return
        let posChanged = false;
        if (pointerOnField) {
            raycaster.setFromCamera(pointerNDC, camera);
            const groundHit = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(groundPlane, groundHit)) {
                const PUSH_RADIUS = 6.0; // ~6 metres
                const PUSH_FORCE = 1.8;

                for (let i = 0; i < particlePositions.length / 3; i++) {
                    const bx = particleBasePos[i * 3];
                    const bz = particleBasePos[i * 3 + 2];
                    const dist = Math.hypot(bx - groundHit.x, bz - groundHit.z);

                    if (dist < PUSH_RADIUS) {
                        const angle = Math.atan2(bz - groundHit.z, bx - groundHit.x);
                        const falloff = 1 - dist / PUSH_RADIUS;
                        const dispX = Math.cos(angle) * PUSH_FORCE * falloff;
                        const dispZ = Math.sin(angle) * PUSH_FORCE * falloff;

                        displacedParticles.set(i, { ox: dispX, oz: dispZ, startTime: now });
                        positions[i * 3] = bx + dispX;
                        positions[i * 3 + 2] = bz + dispZ;
                        posChanged = true;
                    }
                }
            }
        }

        // Spring return (<= 400ms)
        if (displacedParticles.size > 0) {
            const RETURN_DURATION = 380;
            const toRemove: number[] = [];

            for (const [idx, data] of displacedParticles.entries()) {
                const elapsed = now - data.startTime;
                if (elapsed >= RETURN_DURATION) {
                    positions[idx * 3] = particleBasePos[idx * 3];
                    positions[idx * 3 + 2] = particleBasePos[idx * 3 + 2];
                    toRemove.push(idx);
                    posChanged = true;
                } else {
                    const p = elapsed / RETURN_DURATION;
                    // Damped spring oscillation
                    const spring = Math.cos(p * Math.PI * 2.5) * Math.exp(-p * 3.5);
                    positions[idx * 3] = particleBasePos[idx * 3] + data.ox * spring;
                    positions[idx * 3 + 2] = particleBasePos[idx * 3 + 2] + data.oz * spring;
                    posChanged = true;
                }
            }
            for (const r of toRemove) {
                displacedParticles.delete(r);
            }
        }

        if (posChanged) {
            posAttr.needsUpdate = true;
        }

        // 3. Ball arc animation
        if (activeArc) {
            const elapsed = now - activeArc.startTime;
            const p = Math.min(1, elapsed / activeArc.duration);
            const sparkPositions = activeArc.geom.attributes.position.array as Float32Array;
            const currentX = activeArc.startX + (activeArc.targetX - activeArc.startX) * p;
            const currentZ = activeArc.startZ + (activeArc.targetZ - activeArc.startZ) * p;
            // Parabolic arc in Y: apex ~14m
            const currentY = Math.sin(p * Math.PI) * 14;

            // Trail particles follow the ball head
            for (let i = sparkPositions.length / 3 - 1; i > 0; i--) {
                sparkPositions[i * 3] = sparkPositions[(i - 1) * 3];
                sparkPositions[i * 3 + 1] = sparkPositions[(i - 1) * 3 + 1];
                sparkPositions[i * 3 + 2] = sparkPositions[(i - 1) * 3 + 2];
            }
            sparkPositions[0] = currentX + (Math.random() - 0.5) * 0.4;
            sparkPositions[1] = currentY + (Math.random() - 0.5) * 0.4;
            sparkPositions[2] = currentZ + (Math.random() - 0.5) * 0.4;
            activeArc.geom.attributes.position.needsUpdate = true;

            if (p >= 1) {
                scene.remove(activeArc.mesh);
                activeArc.geom.dispose();
                (activeArc.mesh.material as THREE.Material).dispose();
                activeArc = null;
            }
        }

        engine.renderer.render(scene, camera);
    }

    const engine = createSharedEngine({
        container,
        observedElement: fieldWrapper,
        onRender: renderFrame,
        onContextLost: () => dispose(),
        onThemeChange: updateThemeColors,
    });

    // ------------------------------------------------------------------
    // Resize Handler
    // ------------------------------------------------------------------
    function handleResize(isDesktop: boolean) {
        const nextPreset: CameraPreset = isDesktop ? 'sideline' : 'behindPosts';
        if (nextPreset !== currentPreset) {
            currentPreset = nextPreset;
            camera = createCamera(currentPreset);
        }

        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            engine.resize(rect.width, rect.height);
            material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 1.5);
        }
    }

    const resizeObserver = new ResizeObserver(() => handleResize(currentPreset === 'sideline'));
    resizeObserver.observe(container);

    // Initial size
    handleResize(window.innerWidth >= 1024);

    // ------------------------------------------------------------------
    // Teardown / Cleanup
    // ------------------------------------------------------------------
    let isDisposed = false;
    function dispose() {
        if (isDisposed) return;
        isDisposed = true;

        fieldWrapper.removeEventListener('pointermove', onPointerMove);
        fieldWrapper.removeEventListener('pointerleave', onPointerLeave);
        fieldWrapper.removeEventListener('click', onClick);
        resizeObserver.disconnect();

        if (activeArc) {
            scene.remove(activeArc.mesh);
            activeArc.geom.dispose();
            (activeArc.mesh.material as THREE.Material).dispose();
            activeArc = null;
        }

        geometry.dispose();
        material.dispose();
        engine.dispose();
    }

    return {
        resize: handleResize,
        dispose,
    };
}
