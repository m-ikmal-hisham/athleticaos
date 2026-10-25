import type { ThemeColors } from './types';

function parseCssRgbTriplet(raw: string, fallback: [number, number, number]): [number, number, number] {
    if (!raw) return fallback;
    const parts = raw.trim().split(/\s+/).map((n) => Number.parseFloat(n));
    if (parts.length >= 3 && !parts.some((n) => Number.isNaN(n))) {
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    }
    return fallback;
}

export function readThemeColors(): ThemeColors {
    if (typeof document === 'undefined') {
        return {
            isDark: false,
            markings: [0, 71 / 255, 171 / 255],
            tryLine: [193 / 255, 18 / 255, 31 / 255],
            grass: [0.2, 0.35, 0.55],
            markingsOpacity: 0.32,
            grassOpacity: 0.10,
        };
    }

    const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.classList.contains('dark');
    const style = getComputedStyle(document.documentElement);

    // Space-separated RGB triplets in theme.css: e.g. "0 71 171"
    const brandTriplet = parseCssRgbTriplet(style.getPropertyValue('--brand'), [0, 71, 171]);
    const brandTextTriplet = parseCssRgbTriplet(style.getPropertyValue('--brand-text'), [140, 172, 217]);
    const accentTriplet = parseCssRgbTriplet(style.getPropertyValue('--accent'), [193, 18, 31]);

    const markings = isDark ? brandTextTriplet : brandTriplet;
    const tryLine = accentTriplet;
    const grass: [number, number, number] = isDark ? [0.15, 0.25, 0.4] : [0.2, 0.35, 0.55];

    return {
        isDark,
        markings,
        tryLine,
        grass,
        markingsOpacity: 0.32,
        grassOpacity: isDark ? 0.16 : 0.10,
    };
}

export function observeTheme(onChange: (colors: ThemeColors) => void): () => void {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
        return () => {};
    }

    const observer = new MutationObserver(() => {
        onChange(readThemeColors());
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
}
