import * as THREE from 'three';
import type { SharedEngine, SharedEngineOptions, ThemeColors } from './types';
import { observeTheme, readThemeColors } from './themeColors';

export function createSharedEngine(options: SharedEngineOptions): SharedEngine {
    const {
        container,
        observedElement,
        onRender,
        onContextLost,
        onThemeChange,
        force30Fps = false,
    } = options;

    let animFrameId = 0;
    let isDisposed = false;
    let isPaused = false;
    let isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true;
    let isIntersecting = true;

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
    });
    const pixelRatio = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    const canvas = renderer.domElement;
    canvas.className = 'w-full h-full block pointer-events-none';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    // 2. Theme State & Observer
    let currentTheme = readThemeColors();
    const disconnectTheme = observeTheme((newColors: ThemeColors) => {
        currentTheme = newColors;
        onThemeChange?.(newColors);
    });

    // 3. WebGL Context Lost
    function handleContextLost(event: Event) {
        event.preventDefault(); // allow clean dispose
        dispose();
        onContextLost?.();
    }
    canvas.addEventListener('webglcontextlost', handleContextLost);

    // 4. Visibility & Intersection Observers
    function handleVisibilityChange() {
        isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true;
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    const targetEl = observedElement ?? container;
    if (typeof IntersectionObserver !== 'undefined' && targetEl) {
        intersectionObserver = new IntersectionObserver(([entry]) => {
            isIntersecting = entry.isIntersecting;
        });
        intersectionObserver.observe(targetEl);
    }

    // 5. Render Loop with ~30fps Throttle on Coarse Pointers or Force30Fps
    const isCoarse = typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false;
    let lastFrameTime = performance.now();

    function renderLoop(now: number) {
        if (isDisposed) return;
        animFrameId = requestAnimationFrame(renderLoop);

        if (isPaused || !isDocumentVisible || !isIntersecting) {
            return;
        }

        const delta = now - lastFrameTime;
        // Throttle to ~30 fps (~32 ms) on coarse pointer devices or if force30Fps is active
        if ((isCoarse || force30Fps) && delta < 32) {
            return;
        }
        lastFrameTime = now;

        onRender(now, delta);
    }

    animFrameId = requestAnimationFrame(renderLoop);

    function pause() {
        isPaused = true;
    }

    function resume() {
        if (isPaused && !isDisposed) {
            isPaused = false;
            lastFrameTime = performance.now();
        }
    }

    function resize(width: number, height: number) {
        if (isDisposed || width <= 0 || height <= 0) return;
        renderer.setSize(width, height, false);
        const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(pr);
    }

    function dispose() {
        if (isDisposed) return;
        isDisposed = true;

        cancelAnimationFrame(animFrameId);
        canvas.removeEventListener('webglcontextlost', handleContextLost);

        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }

        if (intersectionObserver) {
            intersectionObserver.disconnect();
            intersectionObserver = null;
        }

        disconnectTheme();

        renderer.dispose();
        if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }
    }

    return {
        renderer,
        canvas,
        getThemeColors: () => currentTheme,
        pause,
        resume,
        dispose,
        isDisposed: () => isDisposed,
        resize,
    };
}
