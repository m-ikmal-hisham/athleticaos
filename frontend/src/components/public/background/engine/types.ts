import type * as THREE from 'three';

export interface ThemeColors {
    isDark: boolean;
    markings: [number, number, number];
    tryLine: [number, number, number];
    grass: [number, number, number];
    markingsOpacity: number;
    grassOpacity: number;
}

export interface SharedEngineOptions {
    container: HTMLElement;
    observedElement?: HTMLElement;
    onRender: (time: number, delta: number) => void;
    onContextLost?: () => void;
    onThemeChange?: (colors: ThemeColors) => void;
    /** Enforce ~30 fps regardless of pointer device */
    force30Fps?: boolean;
}

export interface SharedEngine {
    renderer: THREE.WebGLRenderer;
    canvas: HTMLCanvasElement;
    getThemeColors: () => ThemeColors;
    pause: () => void;
    resume: () => void;
    dispose: () => void;
    isDisposed: () => boolean;
    resize: (width: number, height: number) => void;
}
