import * as THREE from 'three';
import { getPitchMarkingLines } from '@/components/public/journey/fieldProjection';
import {
    BG_CAMERA_PRESETS,
    projectBgPoint,
    getPostStructures,
    getBenchStructures,
    type BgCameraPreset,
} from './backgroundProjection';
import { buildStadiumGeometry } from './stadiumGeometry';
import { createSharedEngine } from './engine/renderEngine';
import { readThemeColors } from './engine/themeColors';
import type { ThemeColors } from './engine/types';

export interface PitchBackgroundController {
    resize: (width: number, height: number) => void;
    updateQuietRect: () => void;
    setRouteMode: (mode: 'calm' | 'static', options?: { enableKick?: boolean }) => void;
    triggerSettleReplay: () => void;
    dispose: () => void;
}

export interface MountPitchBackgroundOptions {
    container: HTMLElement;
    initialRouteMode?: 'calm' | 'static';
    initialKickEnabled?: boolean;
    onReady?: () => void;
    onContextLost?: () => void;
}

function assertBgProjectionMatchesThree(camera: THREE.PerspectiveCamera, preset: BgCameraPreset): void {
    if (!import.meta.env.DEV) return;
    const camParam = BG_CAMERA_PRESETS[preset];
    const corners = [
        [0, 0],
        [120, 0],
        [120, 70],
        [0, 70],
    ];
    for (const [x, z] of corners) {
        const mathPt = projectBgPoint(x, z, preset);
        const v = new THREE.Vector3(x, 0, -z).project(camera);
        const threeX = (v.x + 1) * 0.5 * camParam.fullWidth;
        const threeY = (1 - v.y) * 0.5 * camParam.fullHeight;
        const diff = Math.hypot(mathPt.x - threeX, mathPt.y - threeY);
        console.assert(
            diff < 1.0,
            `[BgThreeMatch] Projection divergence at (${x}, ${z}) for ${preset}: diff = ${diff.toFixed(3)} px`
        );
    }
}

function checkIsSettleDevice(): boolean {
    if (typeof window === 'undefined') return false;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    return isCoarse || isStandalone;
}

function getGrassBladeCount(): number {
    if (typeof window === 'undefined') return 16000;
    const isNarrow = window.innerWidth < 768;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    return (isNarrow || isCoarse) ? 8000 : 16000;
}

async function yieldToMain(): Promise<void> {
    const globalScheduler = (globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (typeof globalScheduler?.yield === 'function') {
        return globalScheduler.yield();
    }
    return new Promise((resolve) => setTimeout(resolve, 0));
}

export function mountPitchBackgroundScene(
    options: MountPitchBackgroundOptions
): PitchBackgroundController {
    const {
        container,
        initialRouteMode = 'calm',
        initialKickEnabled = true,
        onReady,
        onContextLost,
    } = options;

    let isDisposed = false;
    let isBuildComplete = false;
    let isCalmRoute = initialRouteMode === 'calm';
    let isKickEnabled = initialKickEnabled;
    let hasRenderedFirstFrame = false;
    let pendingSettleReplay = false;

    let storedWidth = 0;
    let storedHeight = 0;

    let currentPreset: BgCameraPreset =
        window.innerWidth >= 1024
            ? 'bgStadiumSideline'
            : 'bgStadiumEnd';

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    function createCamera(preset: BgCameraPreset, aspect?: number): THREE.PerspectiveCamera {
        const camParam = BG_CAMERA_PRESETS[preset];
        const camAspect = aspect ?? (camParam.fullWidth / camParam.fullHeight);
        const cam = new THREE.PerspectiveCamera(
            camParam.verticalFov,
            camAspect,
            0.5,
            500
        );
        cam.position.set(camParam.worldPosition.x, camParam.worldPosition.y, camParam.worldPosition.z);
        cam.up.set(camParam.worldUp.x, camParam.worldUp.y, camParam.worldUp.z);
        cam.lookAt(camParam.worldTarget.x, camParam.worldTarget.y, camParam.worldTarget.z);
        cam.updateMatrixWorld();
        cam.updateProjectionMatrix();

        assertBgProjectionMatchesThree(cam, preset);
        return cam;
    }

    let camera = createCamera(currentPreset);

    // Track theme colors
    let themeColors = readThemeColors();

    // 2. Markings References
    let markingsGeom: THREE.BufferGeometry | null = null;
    let markPosAttr: THREE.Float32BufferAttribute | null = null;
    let markColAttr: THREE.Float32BufferAttribute | null = null;
    let markAlphaAttr: THREE.Float32BufferAttribute | null = null;
    let markingsMaterial: THREE.ShaderMaterial | null = null;
    let markingsMesh: THREE.Points | null = null;
    const markingsTypes: number[] = [];

    // 3. Grass References
    let grassGeom: THREE.BufferGeometry | null = null;
    let grassMaterial: THREE.ShaderMaterial | null = null;
    let grassMesh: THREE.LineSegments | null = null;

    // 8-slot pointer ring buffer for wake interaction
    const pointerRingData: THREE.Vector4[] = [];
    for (let i = 0; i < 8; i++) {
        pointerRingData.push(new THREE.Vector4(-999, -999, -999, -999));
    }
    let pointerRingIdx = 0;

    // 4. H-Posts References
    let postsGroup: THREE.Group | null = null;
    let postUprightMat: THREE.MeshBasicMaterial | null = null;
    let postPadMat: THREE.MeshBasicMaterial | null = null;

    // 5. Benches References
    let benchGeom: THREE.BufferGeometry | null = null;
    let benchMat: THREE.LineBasicMaterial | null = null;
    let benchLinesMesh: THREE.LineSegments | null = null;

    // 5b. Stadium References
    let stadiumLinesMesh: THREE.LineSegments | null = null;
    let stadiumPointsMesh: THREE.Points | null = null;
    let stadiumRoofMesh: THREE.Mesh | null = null;
    let stadiumLinesGeom: THREE.BufferGeometry | null = null;
    let stadiumLinesMat: THREE.ShaderMaterial | null = null;
    let stadiumPointsGeom: THREE.BufferGeometry | null = null;
    let stadiumPointsMat: THREE.ShaderMaterial | null = null;
    let stadiumRoofGeom: THREE.BufferGeometry | null = null;
    let stadiumRoofMat: THREE.ShaderMaterial | null = null;

    // 6. Rugby Ball & Sparks References
    let ballGeom: THREE.SphereGeometry | null = null;
    let ballMat: THREE.MeshBasicMaterial | null = null;
    let ballMesh: THREE.Mesh | null = null;

    const SPARK_COUNT = 30;
    const sparkPositions = new Float32Array(SPARK_COUNT * 3);
    const sparkAlphas = new Float32Array(SPARK_COUNT);
    const sparkBirth = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
        sparkPositions[i * 3] = -999;
        sparkPositions[i * 3 + 1] = -999;
        sparkPositions[i * 3 + 2] = -999;
        sparkAlphas[i] = 0;
        sparkBirth[i] = -999;
    }
    let sparkGeom: THREE.BufferGeometry | null = null;
    let sparkPosAttr: THREE.BufferAttribute | null = null;
    let sparkAlphaAttr: THREE.BufferAttribute | null = null;
    let sparkMat: THREE.ShaderMaterial | null = null;
    let sparkPoints: THREE.Points | null = null;

    let sparkIdx = 0;
    let isKickActive = false;
    let kickStartTime = 0;
    const KICK_DURATION = 1050; // 1.05s flight
    const kickStartPos = new THREE.Vector3();
    const kickTargetPos = new THREE.Vector3();
    let kickMaxHeight = 8.5;
    let postFlashTime = -999;

    function triggerKick(originX: number, originZ: number, now: number) {
        if (!isBuildComplete || isKickActive || !ballMesh || !grassMaterial) return;

        isKickActive = true;
        kickStartTime = now;
        kickStartPos.set(originX, 0, originZ);

        const targetX = originX < 60 ? 10 : 110;
        const targetZ = -35 + (Math.random() - 0.5) * 4.0;
        const targetY = 4.2; // above crossbar
        kickTargetPos.set(targetX, targetY, targetZ);
        kickMaxHeight = 7.5 + Math.random() * 2.5;

        ballMesh.position.copy(kickStartPos);
        ballMesh.visible = true;

        grassMaterial.uniforms.uKickRipple.value.set(originX, originZ, now * 0.001, 1.0);
    }

    // Click target validation
    function isValidKickTarget(target: EventTarget | null): boolean {
        if (!target || !(target instanceof HTMLElement)) return false;

        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            return false;
        }

        const mainEl = document.querySelector('main');
        let curr: HTMLElement | null = target;

        while (curr && curr !== document.body) {
            if (curr.hasAttribute('data-no-kick')) {
                return false;
            }

            if (curr.matches('a, button, input, select, textarea, label, [role="button"], [role="link"], [contenteditable]')) {
                return false;
            }

            if (curr !== mainEl) {
                const style = window.getComputedStyle(curr);
                const bgCol = style.backgroundColor;
                if (
                    bgCol &&
                    bgCol !== 'transparent' &&
                    bgCol !== 'rgba(0, 0, 0, 0)' &&
                    bgCol !== 'hsla(0, 0%, 0%, 0)'
                ) {
                    return false;
                }
                const bgImg = style.backgroundImage;
                if (bgImg && bgImg !== 'none') {
                    return false;
                }
            }

            if (curr === mainEl) break;
            curr = curr.parentElement;
        }

        return true;
    }

    // Pointer & Click listeners
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2(-999, -999);
    let lastPointerUpdate = 0;

    function updatePointerWake(clientX: number, clientY: number, nowSec: number) {
        if (!isBuildComplete || isDisposed) return;
        if (nowSec - lastPointerUpdate < 0.02) return; // throttle ~50fps
        lastPointerUpdate = nowSec;

        const rect = engine.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        raycaster.setFromCamera(pointerNDC, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, hit)) {
            pointerRingData[pointerRingIdx].set(hit.x, 0, hit.z, nowSec);
            pointerRingIdx = (pointerRingIdx + 1) % 8;
        }
    }

    function onPointerMove(e: PointerEvent) {
        if (!isBuildComplete || isDisposed) return;
        onUserActivity();
        const isFine = window.matchMedia('(pointer: fine)').matches;
        if (!isFine) return;
        updatePointerWake(e.clientX, e.clientY, performance.now() * 0.001);
    }

    function onClick(e: MouseEvent) {
        if (!isBuildComplete || isDisposed) return;
        onUserActivity();
        if (!isCalmRoute || !isKickEnabled) return;
        const isFine = window.matchMedia('(pointer: fine)').matches;
        if (!isFine) return;

        if (!isValidKickTarget(e.target)) return;

        const rect = engine.canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        raycaster.setFromCamera(pointerNDC, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, hit)) {
            const pitchX = Math.max(5, Math.min(115, hit.x));
            const pitchZ = Math.max(-68, Math.min(-2, hit.z));
            triggerKick(pitchX, pitchZ, performance.now());
        }
    }

    // Settle mode & idle management
    const isSettle = checkIsSettleDevice();
    let settleActive = isSettle;
    let settleStartTime = performance.now();
    const SETTLE_DURATION = 6000; // 6 seconds

    let lastDesktopActivity = performance.now();
    const DESKTOP_IDLE_TIMEOUT = 30000; // 30 seconds
    let isDesktopPaused = false;

    function onUserActivity() {
        if (!isBuildComplete || isDisposed) return;
        lastDesktopActivity = performance.now();
        if (isDesktopPaused) {
            isDesktopPaused = false;
            engine.resume();
        }
    }

    function onVisibilityChange() {
        if (!isBuildComplete || isDisposed) return;
        if (document.visibilityState === 'visible') {
            if (isSettle) {
                settleActive = true;
                settleStartTime = performance.now();
                engine.resume();
            } else {
                onUserActivity();
            }
        }
    }

    // Theme update handler
    function updateThemeColors(newColors: ThemeColors) {
        themeColors = newColors;
        if (!isBuildComplete || isDisposed) return;

        if (markColAttr && markAlphaAttr) {
            const colors = markColAttr.array as Float32Array;
            const alphas = markAlphaAttr.array as Float32Array;

            const curMarkingsOpacity = themeColors.isDark ? 0.30 : 0.22;
            const curTryLineOpacity = themeColors.isDark ? 0.38 : 0.28;

            for (let i = 0; i < markingsTypes.length; i++) {
                const isTry = markingsTypes[i] === 1;
                const c = isTry ? themeColors.tryLine : themeColors.markings;
                const a = isTry ? curTryLineOpacity : curMarkingsOpacity;

                colors[i * 3] = c[0];
                colors[i * 3 + 1] = c[1];
                colors[i * 3 + 2] = c[2];
                alphas[i] = a;
            }
            markColAttr.needsUpdate = true;
            markAlphaAttr.needsUpdate = true;
        }

        if (grassMaterial) {
            grassMaterial.uniforms.uThemeDark.value = themeColors.isDark ? 1.0 : 0.0;
            grassMaterial.uniforms.uGrassColor.value.setRGB(
                themeColors.grass[0],
                themeColors.grass[1],
                themeColors.grass[2]
            );
        }

        if (postUprightMat) postUprightMat.color.setRGB(themeColors.markings[0], themeColors.markings[1], themeColors.markings[2]);
        if (postPadMat) postPadMat.color.setRGB(themeColors.tryLine[0], themeColors.tryLine[1], themeColors.tryLine[2]);
        if (benchMat) benchMat.color.setRGB(themeColors.markings[0], themeColors.markings[1], themeColors.markings[2]);
        if (ballMat) ballMat.color.setHex(themeColors.isDark ? 0xF0F4F8 : 0x0047AB);

        if (stadiumLinesMat) {
            stadiumLinesMat.uniforms.uColor.value.setRGB(
                themeColors.stadiumLines[0],
                themeColors.stadiumLines[1],
                themeColors.stadiumLines[2]
            );
            stadiumLinesMat.uniforms.uAlpha.value = themeColors.stadiumLinesOpacity;
        }
        if (stadiumPointsMat) {
            stadiumPointsMat.uniforms.uSeatColor.value.setRGB(
                themeColors.stadiumSeats[0],
                themeColors.stadiumSeats[1],
                themeColors.stadiumSeats[2]
            );
            stadiumPointsMat.uniforms.uSeatAlpha.value = themeColors.stadiumSeatsOpacity;
            stadiumPointsMat.uniforms.uFloodlightColor.value.setRGB(
                themeColors.stadiumFloodlights[0],
                themeColors.stadiumFloodlights[1],
                themeColors.stadiumFloodlights[2]
            );
        }
        if (stadiumRoofMat) {
            stadiumRoofMat.uniforms.uColor.value.setRGB(
                themeColors.stadiumRoof[0],
                themeColors.stadiumRoof[1],
                themeColors.stadiumRoof[2]
            );
            stadiumRoofMat.uniforms.uAlpha.value = themeColors.stadiumRoofOpacity;
        }
    }

    // Render frame
    function renderFrame(now: number) {
        if (!isBuildComplete || isDisposed) return;
        const timeSec = now * 0.001;

        if (isSettle) {
            if (settleActive && (now - settleStartTime > SETTLE_DURATION)) {
                settleActive = false;
                engine.renderer.render(scene, camera);
                if (!hasRenderedFirstFrame) {
                    hasRenderedFirstFrame = true;
                    performance.mark('athleticaos:bg-ready');
                    onReady?.();
                }
                engine.pause();
                return;
            }
        } else {
            if (!isKickActive && (now - lastDesktopActivity > DESKTOP_IDLE_TIMEOUT)) {
                if (!isDesktopPaused) {
                    isDesktopPaused = true;
                    engine.renderer.render(scene, camera);
                    if (!hasRenderedFirstFrame) {
                        hasRenderedFirstFrame = true;
                        performance.mark('athleticaos:bg-ready');
                        onReady?.();
                    }
                    engine.pause();
                    return;
                }
            }
        }

        if (markingsMaterial) {
            markingsMaterial.uniforms.uTime.value = timeSec;
        }
        if (grassMaterial) {
            grassMaterial.uniforms.uTime.value = timeSec;
        }

        // Kick Ball Arc Animation
        if (isKickActive && ballMesh && grassMaterial) {
            const elapsed = now - kickStartTime;
            const progress = Math.min(1.0, elapsed / KICK_DURATION);

            const arcY = 4.0 * kickMaxHeight * progress * (1.0 - progress);
            const curX = kickStartPos.x + (kickTargetPos.x - kickStartPos.x) * progress;
            const curZ = kickStartPos.z + (kickTargetPos.z - kickStartPos.z) * progress;
            const curY = kickStartPos.y + (kickTargetPos.y - kickStartPos.y) * progress + arcY;

            ballMesh.position.set(curX, curY, curZ);
            ballMesh.rotation.x += 0.14;
            ballMesh.rotation.z += 0.22;
            ballMesh.lookAt(kickTargetPos.x, curY + 1.0, kickTargetPos.z);

            sparkPositions[sparkIdx * 3] = curX + (Math.random() - 0.5) * 0.3;
            sparkPositions[sparkIdx * 3 + 1] = curY + (Math.random() - 0.5) * 0.3;
            sparkPositions[sparkIdx * 3 + 2] = curZ + (Math.random() - 0.5) * 0.3;
            sparkAlphas[sparkIdx] = 0.85;
            sparkBirth[sparkIdx] = now;
            sparkIdx = (sparkIdx + 1) % SPARK_COUNT;

            if (progress >= 0.95 && progress < 1.0) {
                if (Math.abs(curZ - (-35)) < 2.8 && curY >= 3.0) {
                    postFlashTime = now;
                }
            }

            if (progress >= 1.0) {
                isKickActive = false;
                ballMesh.visible = false;
                grassMaterial.uniforms.uKickRipple.value.w = 0.0;
            }
        }

        // Update Sparks
        let sparksActive = false;
        for (let i = 0; i < SPARK_COUNT; i++) {
            if (sparkAlphas[i] > 0) {
                const age = now - sparkBirth[i];
                if (age > 450) {
                    sparkAlphas[i] = 0;
                    sparkPositions[i * 3 + 1] = -999;
                } else {
                    sparkAlphas[i] = 0.85 * (1.0 - age / 450);
                    sparkPositions[i * 3 + 1] -= 0.015;
                    sparksActive = true;
                }
            }
        }
        if ((sparksActive || isKickActive) && sparkPosAttr && sparkAlphaAttr) {
            sparkPosAttr.needsUpdate = true;
            sparkAlphaAttr.needsUpdate = true;
        }

        // Stadium Points Update
        if (stadiumPointsMat) {
            stadiumPointsMat.uniforms.uTime.value = timeSec;
            const isFinePointer = typeof window !== 'undefined' ? window.matchMedia('(pointer: fine)').matches : false;
            const allowShimmer = !isSettle && isFinePointer && !isDesktopPaused;
            stadiumPointsMat.uniforms.uCrowdShimmer.value = allowShimmer ? 1.0 : 0.0;

            if (now - postFlashTime < 600) {
                const flashDecay = 1.0 - (now - postFlashTime) / 600;
                stadiumPointsMat.uniforms.uFloodlightFlash.value = flashDecay;
            } else {
                stadiumPointsMat.uniforms.uFloodlightFlash.value = 0.0;
            }
        }

        // Post Flash Animation
        if (postUprightMat && postPadMat) {
            if (now - postFlashTime < 600) {
                const flashDecay = 1.0 - (now - postFlashTime) / 600;
                postUprightMat.opacity = 0.45 + flashDecay * 0.55;
                postPadMat.opacity = 0.55 + flashDecay * 0.45;
            } else {
                postUprightMat.opacity = 0.45;
                postPadMat.opacity = 0.55;
            }
        }

        engine.renderer.render(scene, camera);

        if (!hasRenderedFirstFrame) {
            hasRenderedFirstFrame = true;
            performance.mark('athleticaos:bg-ready');
            onReady?.();
        }
    }

    // Shared Engine Mount (created in Step 0, paused while building)
    const engine = createSharedEngine({
        container,
        onRender: renderFrame,
        onContextLost: () => {
            dispose();
            onContextLost?.();
        },
        onThemeChange: updateThemeColors,
        force30Fps: checkIsSettleDevice(),
    });
    engine.pause();

    // Resize handling
    function handleResize(width: number, height: number) {
        if (isDisposed || width <= 0 || height <= 0) return;
        storedWidth = width;
        storedHeight = height;
        if (!isBuildComplete) return;

        const nextPreset: BgCameraPreset =
            width >= 1024
                ? 'bgStadiumSideline'
                : 'bgStadiumEnd';

        if (nextPreset !== currentPreset) {
            currentPreset = nextPreset;
            camera = createCamera(currentPreset, width / height);
        } else {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }

        engine.resize(width, height);
        const pRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        if (markingsMaterial) markingsMaterial.uniforms.uPixelRatio.value = pRatio;
        if (sparkMat) sparkMat.uniforms.uPixelRatio.value = pRatio;
        if (stadiumPointsMat) stadiumPointsMat.uniforms.uPixelRatio.value = pRatio;
    }

    // Cleanup helper
    function cleanup() {
        markingsGeom?.dispose();
        markingsMaterial?.dispose();
        grassGeom?.dispose();
        grassMaterial?.dispose();
        postsGroup?.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry?.dispose();
            }
        });
        postUprightMat?.dispose();
        postPadMat?.dispose();
        benchGeom?.dispose();
        benchMat?.dispose();
        stadiumLinesGeom?.dispose();
        stadiumLinesMat?.dispose();
        stadiumPointsGeom?.dispose();
        stadiumPointsMat?.dispose();
        stadiumRoofGeom?.dispose();
        stadiumRoofMat?.dispose();
        ballGeom?.dispose();
        ballMat?.dispose();
        sparkGeom?.dispose();
        sparkMat?.dispose();
        engine.dispose();
    }

    function dispose() {
        if (isDisposed) return;
        isDisposed = true;

        if (typeof window !== 'undefined') {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('click', onClick);
            window.removeEventListener('scroll', onUserActivity);
            window.removeEventListener('wheel', onUserActivity);
            window.removeEventListener('keydown', onUserActivity);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        }

        cleanup();
    }

    function setRouteMode(mode: 'calm' | 'static', optionsMode?: { enableKick?: boolean }) {
        isCalmRoute = mode === 'calm';
        if (optionsMode && typeof optionsMode.enableKick === 'boolean') {
            isKickEnabled = optionsMode.enableKick;
        } else {
            isKickEnabled = true;
        }
        if (!isBuildComplete || isDisposed) return;
        if (mode === 'static') {
            engine.pause();
        } else {
            engine.resume();
        }
    }

    function triggerSettleReplay() {
        if (!isBuildComplete) {
            pendingSettleReplay = true;
            return;
        }
        if (isSettle) {
            settleActive = true;
            settleStartTime = performance.now();
            engine.resume();
        } else {
            onUserActivity();
        }
    }

    // Attach listeners in step 0 (they check isBuildComplete and no-op until scene is built)
    if (typeof window !== 'undefined') {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('click', onClick, { passive: true });
        window.addEventListener('scroll', onUserActivity, { passive: true });
        window.addEventListener('wheel', onUserActivity, { passive: true });
        window.addEventListener('keydown', onUserActivity, { passive: true });
        document.addEventListener('visibilitychange', onVisibilityChange);
    }

    // Async Sequence Runner
    (async () => {
        const tStart = performance.now();

        // -------------------------------------------------------------
        // Step 0: Setup & Timing
        // -------------------------------------------------------------
        performance.mark('athleticaos:bg-start');
        const t0 = performance.now();
        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 0 (setup): ${(t0 - tStart).toFixed(2)}ms`);
        }
        await yieldToMain();
        if (isDisposed) { cleanup(); return; }

        // -------------------------------------------------------------
        // Step 1: Ground Markings
        // -------------------------------------------------------------
        const t1 = performance.now();
        const lines = getPitchMarkingLines();
        const markingsPositions: number[] = [];
        const markingsColors: number[] = [];
        const markingsAlphas: number[] = [];

        const markingsOpacity = themeColors.isDark ? 0.30 : 0.22;
        const tryLineOpacity = themeColors.isDark ? 0.38 : 0.28;

        for (const line of lines) {
            const dx = line.x2 - line.x1;
            const dz = line.z2 - line.z1;
            const len = Math.hypot(dx, dz);
            const steps = Math.max(2, Math.round(len / 1.1));
            const isTry = Boolean(line.isTryLine);

            for (let s = 0; s <= steps; s++) {
                if (line.type === 'dashed' && Math.floor(s / 3) % 2 === 1) {
                    continue;
                }
                const frac = s / steps;
                const gx = line.x1 + dx * frac;
                const gz = line.z1 + dz * frac;
                const wx = gx;
                const wy = 0;
                const wz = -gz;

                markingsPositions.push(wx, wy, wz);

                const col = isTry ? themeColors.tryLine : themeColors.markings;
                markingsColors.push(col[0], col[1], col[2]);
                markingsAlphas.push(isTry ? tryLineOpacity : markingsOpacity);
                markingsTypes.push(isTry ? 1 : 0);
            }
        }

        markingsGeom = new THREE.BufferGeometry();
        markPosAttr = new THREE.Float32BufferAttribute(markingsPositions, 3);
        markColAttr = new THREE.Float32BufferAttribute(markingsColors, 3);
        markAlphaAttr = new THREE.Float32BufferAttribute(markingsAlphas, 1);
        markingsGeom.setAttribute('position', markPosAttr);
        markingsGeom.setAttribute('color', markColAttr);
        markingsGeom.setAttribute('alpha', markAlphaAttr);

        const markingsVertexShader = `
            attribute float alpha;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform float uPixelRatio;

            void main() {
                vColor = color;
                float driftAmp = 0.12;
                float driftX = sin(uTime * 0.22 + position.z * 0.05) * driftAmp;
                float driftZ = cos(uTime * 0.18 + position.x * 0.05) * (driftAmp * 0.6);

                vec4 driftedMv = modelViewMatrix * vec4(position.x + driftX, position.y, position.z + driftZ, 1.0);
                vec4 finalClip = projectionMatrix * driftedMv;

                float normY = ((finalClip.y / finalClip.w) + 1.0) * 0.5;
                float horizonFade = 1.0 - smoothstep(0.72, 0.95, normY);

                vAlpha = alpha * horizonFade;
                gl_PointSize = clamp(170.0 / -driftedMv.z, 1.5, 5.0) * uPixelRatio;
                gl_Position = finalClip;
            }
        `;

        const markingsFragmentShader = `
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                vec2 coord = gl_PointCoord - vec2(0.5);
                float dist = length(coord);
                if (dist > 0.5) discard;
                float edge = smoothstep(0.5, 0.15, dist);
                gl_FragColor = vec4(vColor, vAlpha * edge);
            }
        `;

        markingsMaterial = new THREE.ShaderMaterial({
            vertexShader: markingsVertexShader,
            fragmentShader: markingsFragmentShader,
            transparent: true,
            depthWrite: false,
            vertexColors: true,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
            },
        });

        markingsMesh = new THREE.Points(markingsGeom, markingsMaterial);
        scene.add(markingsMesh);

        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 1 (markings): ${(performance.now() - t1).toFixed(2)}ms`);
        }
        await yieldToMain();
        if (isDisposed) { cleanup(); return; }

        // -------------------------------------------------------------
        // Step 2: Grass
        // -------------------------------------------------------------
        const t2 = performance.now();
        const grassBladeCount = getGrassBladeCount();
        const grassPositions = new Float32Array(grassBladeCount * 2 * 3);
        const grassIsTip = new Float32Array(grassBladeCount * 2);
        const grassBladeSeed = new Float32Array(grassBladeCount * 2);

        for (let i = 0; i < grassBladeCount; i++) {
            const gx = Math.random() * 120;
            const gz = Math.random() * 70;
            const wx = gx;
            const wz = -gz;
            const height = 0.45 + Math.random() * 0.3;
            const leanX = (Math.random() - 0.5) * 0.24;
            const leanZ = (Math.random() - 0.5) * 0.24;
            const seed = Math.random();

            const idx0 = i * 2;
            grassPositions[idx0 * 3] = wx;
            grassPositions[idx0 * 3 + 1] = 0;
            grassPositions[idx0 * 3 + 2] = wz;
            grassIsTip[idx0] = 0.0;
            grassBladeSeed[idx0] = seed;

            const idx1 = i * 2 + 1;
            grassPositions[idx1 * 3] = wx + leanX;
            grassPositions[idx1 * 3 + 1] = height;
            grassPositions[idx1 * 3 + 2] = wz + leanZ;
            grassIsTip[idx1] = 1.0;
            grassBladeSeed[idx1] = seed;
        }

        grassGeom = new THREE.BufferGeometry();
        grassGeom.setAttribute('position', new THREE.BufferAttribute(grassPositions, 3));
        grassGeom.setAttribute('isTip', new THREE.BufferAttribute(grassIsTip, 1));
        grassGeom.setAttribute('bladeSeed', new THREE.BufferAttribute(grassBladeSeed, 1));

        const grassVertexShader = `
            attribute float isTip;
            attribute float bladeSeed;

            uniform float uTime;
            uniform vec4 uPointerRing[8];
            uniform vec4 uKickRipple;
            uniform float uThemeDark;

            varying float vBrighten;
            varying float vIsTip;
            varying float vAlpha;

            void main() {
                vec3 worldPos = position;
                float wakeBrighten = 0.0;

                if (isTip > 0.5) {
                    float idleX = sin(uTime * 1.5 + worldPos.x * 0.15 + bladeSeed * 6.28) * 0.08;
                    float idleZ = cos(uTime * 1.2 + worldPos.z * 0.15 + bladeSeed * 6.28) * 0.06;
                    worldPos.x += idleX;
                    worldPos.z += idleZ;

                    float gustCycle = mod(uTime, 10.0);
                    if (gustCycle < 5.0) {
                        float gustX = -10.0 + (gustCycle / 5.0) * 140.0;
                        float distToGust = abs(worldPos.x - gustX);
                        float gustStrength = smoothstep(22.0, 0.0, distToGust);
                        worldPos.x += gustStrength * 0.25;
                        worldPos.z -= gustStrength * 0.14;
                    }

                    for (int i = 0; i < 8; i++) {
                        vec4 p = uPointerRing[i];
                        float age = uTime - p.w;
                        if (age >= 0.0 && age < 0.8) {
                            float decay = 1.0 - (age / 0.8);
                            float dist = distance(worldPos.xz, p.xz);
                            if (dist < 4.5) {
                                float wakeFactor = (1.0 - dist / 4.5) * decay;
                                vec2 dir = normalize(worldPos.xz - p.xz + vec2(0.001, 0.001));
                                worldPos.xz += dir * (0.6 * wakeFactor);
                                wakeBrighten = max(wakeBrighten, wakeFactor);
                            }
                        }
                    }

                    if (uKickRipple.w > 0.5) {
                        float ripAge = uTime - uKickRipple.z;
                        if (ripAge >= 0.0 && ripAge < 0.8) {
                            float ripRadius = ripAge * 10.0;
                            float ripDist = distance(worldPos.xz, uKickRipple.xy);
                            float ripDiff = abs(ripDist - ripRadius);
                            if (ripDiff < 2.0) {
                                float ripFactor = (1.0 - ripDiff / 2.0) * (1.0 - ripAge / 0.8);
                                vec2 ripDir = normalize(worldPos.xz - uKickRipple.xy + vec2(0.001, 0.001));
                                worldPos.xz += ripDir * (0.5 * ripFactor);
                                wakeBrighten = max(wakeBrighten, ripFactor * 0.8);
                            }
                        }
                    }
                }

                vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
                vec4 clipPos = projectionMatrix * mvPosition;

                float normY = ((clipPos.y / clipPos.w) + 1.0) * 0.5;
                float horizonFade = 1.0 - smoothstep(0.72, 0.95, normY);

                vBrighten = wakeBrighten;
                vIsTip = isTip;
                vAlpha = horizonFade;
                gl_Position = clipPos;
            }
        `;

        const grassFragmentShader = `
            varying float vBrighten;
            varying float vIsTip;
            varying float vAlpha;

            uniform float uThemeDark;
            uniform vec3 uGrassColor;

            void main() {
                float baseAlpha = uThemeDark > 0.5 ? 0.19 : 0.13;
                float rootFade = mix(0.4, 1.0, vIsTip);

                vec3 brightTarget = uThemeDark > 0.5 ? vec3(1.0, 1.0, 1.0) : vec3(0.00, 0.08, 0.25);
                vec3 finalColor = mix(uGrassColor, brightTarget, vBrighten * 0.85);

                float finalAlpha = clamp(baseAlpha * rootFade + vBrighten * 0.35, 0.0, 0.65) * vAlpha;
                gl_FragColor = vec4(finalColor, finalAlpha);
            }
        `;

        grassMaterial = new THREE.ShaderMaterial({
            vertexShader: grassVertexShader,
            fragmentShader: grassFragmentShader,
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uPointerRing: { value: pointerRingData },
                uKickRipple: { value: new THREE.Vector4(-999, -999, -999, 0) },
                uThemeDark: { value: themeColors.isDark ? 1.0 : 0.0 },
                uGrassColor: { value: new THREE.Color(themeColors.grass[0], themeColors.grass[1], themeColors.grass[2]) },
            },
        });

        grassMesh = new THREE.LineSegments(grassGeom, grassMaterial);
        scene.add(grassMesh);

        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 2 (grass, count=${grassBladeCount}): ${(performance.now() - t2).toFixed(2)}ms`);
        }
        await yieldToMain();
        if (isDisposed) { cleanup(); return; }

        // -------------------------------------------------------------
        // Step 3: Stadium Bowl & Ring Roof
        // -------------------------------------------------------------
        const t3 = performance.now();
        const stadiumData = buildStadiumGeometry();

        stadiumLinesGeom = new THREE.BufferGeometry();
        stadiumLinesGeom.setAttribute(
            'position',
            new THREE.BufferAttribute(stadiumData.lines.positions, 3)
        );

        stadiumLinesMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying float vAlpha;
                void main() {
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vec4 clipPos = projectionMatrix * mv;
                    float normY = ((clipPos.y / clipPos.w) + 1.0) * 0.5;
                    float fade = 1.0 - smoothstep(0.88, 1.0, normY);
                    vAlpha = fade;
                    gl_Position = clipPos;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uAlpha;
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4(uColor, uAlpha * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            uniforms: {
                uColor: { value: new THREE.Color(themeColors.stadiumLines[0], themeColors.stadiumLines[1], themeColors.stadiumLines[2]) },
                uAlpha: { value: themeColors.stadiumLinesOpacity },
            },
        });
        stadiumLinesMesh = new THREE.LineSegments(stadiumLinesGeom, stadiumLinesMat);
        scene.add(stadiumLinesMesh);

        stadiumPointsGeom = new THREE.BufferGeometry();
        stadiumPointsGeom.setAttribute(
            'position',
            new THREE.BufferAttribute(stadiumData.points.positions, 3)
        );
        stadiumPointsGeom.setAttribute(
            'aType',
            new THREE.BufferAttribute(stadiumData.points.types, 1)
        );
        stadiumPointsGeom.setAttribute(
            'aSeed',
            new THREE.BufferAttribute(stadiumData.points.seeds, 1)
        );

        stadiumPointsMat = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float aType;
                attribute float aSeed;
                uniform float uTime;
                uniform float uPixelRatio;
                uniform float uCrowdShimmer;
                uniform float uFloodlightFlash;
                uniform vec3 uSeatColor;
                uniform vec3 uFloodlightColor;
                uniform float uSeatAlpha;
                varying vec3 vColor;
                varying float vAlpha;

                void main() {
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vec4 clipPos = projectionMatrix * mv;

                    float normY = ((clipPos.y / clipPos.w) + 1.0) * 0.5;
                    float horizonFade = 1.0 - smoothstep(0.88, 1.0, normY);

                    if (aType > 0.5) {
                        vColor = mix(uFloodlightColor, vec3(1.0, 1.0, 1.0), uFloodlightFlash);
                        vAlpha = clamp(0.55 + uFloodlightFlash * 0.45, 0.0, 1.0) * horizonFade;
                        gl_PointSize = (4.0 + uFloodlightFlash * 4.0) * uPixelRatio;
                    } else {
                        float shimmer = 0.0;
                        if (uCrowdShimmer > 0.5) {
                            float s = sin(uTime * 1.5 + aSeed * 62.83);
                            shimmer = smoothstep(0.96, 1.0, s);
                        }
                        vColor = mix(uSeatColor, vec3(1.0, 1.0, 1.0), shimmer * 0.7);
                        vAlpha = clamp(uSeatAlpha + shimmer * 0.25, 0.0, 0.6) * horizonFade;
                        gl_PointSize = (1.8 + shimmer * 1.2) * uPixelRatio;
                    }
                    gl_Position = clipPos;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vAlpha;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if (length(coord) > 0.5) discard;
                    gl_FragColor = vec4(vColor, vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
                uCrowdShimmer: { value: 0.0 },
                uFloodlightFlash: { value: 0.0 },
                uSeatColor: { value: new THREE.Color(themeColors.stadiumSeats[0], themeColors.stadiumSeats[1], themeColors.stadiumSeats[2]) },
                uFloodlightColor: { value: new THREE.Color(themeColors.stadiumFloodlights[0], themeColors.stadiumFloodlights[1], themeColors.stadiumFloodlights[2]) },
                uSeatAlpha: { value: themeColors.stadiumSeatsOpacity },
            },
        });
        stadiumPointsMesh = new THREE.Points(stadiumPointsGeom, stadiumPointsMat);
        scene.add(stadiumPointsMesh);

        stadiumRoofGeom = new THREE.BufferGeometry();
        stadiumRoofGeom.setAttribute(
            'position',
            new THREE.BufferAttribute(stadiumData.roofMesh.positions, 3)
        );
        stadiumRoofGeom.setIndex(
            new THREE.BufferAttribute(stadiumData.roofMesh.indices, 1)
        );

        stadiumRoofMat = new THREE.ShaderMaterial({
            vertexShader: `
                varying float vAlpha;
                void main() {
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    vec4 clipPos = projectionMatrix * mv;
                    float normY = ((clipPos.y / clipPos.w) + 1.0) * 0.5;
                    float fade = 1.0 - smoothstep(0.88, 1.0, normY);
                    vAlpha = fade;
                    gl_Position = clipPos;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform float uAlpha;
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4(uColor, uAlpha * vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                uColor: { value: new THREE.Color(themeColors.stadiumRoof[0], themeColors.stadiumRoof[1], themeColors.stadiumRoof[2]) },
                uAlpha: { value: themeColors.stadiumRoofOpacity },
            },
        });
        stadiumRoofMesh = new THREE.Mesh(stadiumRoofGeom, stadiumRoofMat);
        scene.add(stadiumRoofMesh);

        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 3 (stadium): ${(performance.now() - t3).toFixed(2)}ms`);
        }
        await yieldToMain();
        if (isDisposed) { cleanup(); return; }

        // -------------------------------------------------------------
        // Step 4: Benches, H-Posts, Rugby Ball & Sparks
        // -------------------------------------------------------------
        const t4 = performance.now();
        postsGroup = new THREE.Group();
        postUprightMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(themeColors.markings[0], themeColors.markings[1], themeColors.markings[2]),
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
        });
        postPadMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(themeColors.tryLine[0], themeColors.tryLine[1], themeColors.tryLine[2]),
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
        });

        const postStructures = getPostStructures();
        for (const post of postStructures) {
            const isPad = post.part === 'pad';
            const isCrossbar = post.part === 'crossbar';

            if (isCrossbar) {
                const length = Math.abs(post.p2.z - post.p1.z);
                const cyl = new THREE.CylinderGeometry(0.06, 0.06, length, 12);
                cyl.rotateX(Math.PI / 2);
                const mesh = new THREE.Mesh(cyl, postUprightMat);
                mesh.position.set(post.p1.x, post.p1.y, (post.p1.z + post.p2.z) * 0.5);
                postsGroup.add(mesh);
            } else if (isPad) {
                const height = Math.abs(post.p2.y - post.p1.y);
                const cyl = new THREE.CylinderGeometry(0.20, 0.20, height, 12);
                const mesh = new THREE.Mesh(cyl, postPadMat);
                mesh.position.set(post.p1.x, (post.p1.y + post.p2.y) * 0.5, post.p1.z);
                postsGroup.add(mesh);
            } else {
                const height = Math.abs(post.p2.y - post.p1.y);
                const cyl = new THREE.CylinderGeometry(0.06, 0.06, height, 12);
                const mesh = new THREE.Mesh(cyl, postUprightMat);
                mesh.position.set(post.p1.x, (post.p1.y + post.p2.y) * 0.5, post.p1.z);
                postsGroup.add(mesh);
            }
        }
        scene.add(postsGroup);

        const benches = getBenchStructures();
        const benchPositions: number[] = [];
        for (const b of benches) {
            benchPositions.push(b.p1.x, b.p1.y, -b.p1.z);
            benchPositions.push(b.p2.x, b.p2.y, -b.p2.z);
        }
        benchGeom = new THREE.BufferGeometry();
        benchGeom.setAttribute('position', new THREE.Float32BufferAttribute(benchPositions, 3));
        benchMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(themeColors.markings[0], themeColors.markings[1], themeColors.markings[2]),
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
        });
        benchLinesMesh = new THREE.LineSegments(benchGeom, benchMat);
        scene.add(benchLinesMesh);

        ballGeom = new THREE.SphereGeometry(0.32, 16, 12);
        ballGeom.scale(1.0, 0.55, 0.55);
        ballMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(themeColors.isDark ? 0xF0F4F8 : 0x0047AB),
            transparent: true,
            opacity: 0.95,
        });
        ballMesh = new THREE.Mesh(ballGeom, ballMat);
        ballMesh.visible = false;
        scene.add(ballMesh);

        sparkGeom = new THREE.BufferGeometry();
        sparkPosAttr = new THREE.BufferAttribute(sparkPositions, 3);
        sparkAlphaAttr = new THREE.BufferAttribute(sparkAlphas, 1);
        sparkGeom.setAttribute('position', sparkPosAttr);
        sparkGeom.setAttribute('alpha', sparkAlphaAttr);

        sparkMat = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float alpha;
                varying float vAlpha;
                uniform float uPixelRatio;
                void main() {
                    vAlpha = alpha;
                    vec4 mv = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = clamp(140.0 / -mv.z, 2.0, 6.0) * uPixelRatio;
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                uniform vec3 uColor;
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if (length(coord) > 0.5) discard;
                    gl_FragColor = vec4(uColor, vAlpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            uniforms: {
                uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
                uColor: { value: new THREE.Color(0xDC2626) },
            },
        });
        sparkPoints = new THREE.Points(sparkGeom, sparkMat);
        scene.add(sparkPoints);

        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 4 (benches + sparks): ${(performance.now() - t4).toFixed(2)}ms`);
        }
        await yieldToMain();
        if (isDisposed) { cleanup(); return; }

        // -------------------------------------------------------------
        // Step 5: Shader Precompilation & First Frame
        // -------------------------------------------------------------
        const t5 = performance.now();
        if (typeof engine.renderer.compileAsync === 'function') {
            try {
                await engine.renderer.compileAsync(scene, camera);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.warn('[PitchBackgroundScene] compileAsync fallback:', err);
                }
            }
        } else if (typeof engine.renderer.compile === 'function') {
            engine.renderer.compile(scene, camera);
        }

        if (isDisposed) { cleanup(); return; }

        isBuildComplete = true;

        // Apply initial resize with latest or stored rect
        const initRect = container.getBoundingClientRect();
        const rw = storedWidth || initRect.width || window.innerWidth;
        const rh = storedHeight || initRect.height || window.innerHeight;
        handleResize(rw, rh);

        if (pendingSettleReplay) {
            pendingSettleReplay = false;
            settleActive = true;
            settleStartTime = performance.now();
        }

        if (isCalmRoute) {
            engine.resume();
        } else {
            engine.renderer.render(scene, camera);
            if (!hasRenderedFirstFrame) {
                hasRenderedFirstFrame = true;
                performance.mark('athleticaos:bg-ready');
                onReady?.();
            }
        }

        if (import.meta.env.DEV) {
            console.log(`[PitchBackgroundScene] Step 5 (compileAsync + first frame): ${(performance.now() - t5).toFixed(2)}ms`);
            console.log(`[PitchBackgroundScene] Total build time: ${(performance.now() - tStart).toFixed(2)}ms`);
        }
    })().catch((err) => {
        if (import.meta.env.DEV) {
            console.warn('[PitchBackgroundScene] Async build error:', err);
        }
    });

    return {
        resize: handleResize,
        updateQuietRect: () => {},
        setRouteMode,
        triggerSettleReplay,
        dispose,
    };
}
