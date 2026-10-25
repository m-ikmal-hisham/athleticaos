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
            stadiumLines: [0, 71 / 255, 171 / 255],
            stadiumRoof: [0.75, 0.82, 0.92],
            stadiumSeats: [0.20, 0.35, 0.55],
            stadiumFloodlights: [1.0, 1.0, 1.0],
            stadiumLinesOpacity: 0.15,
            stadiumRoofOpacity: 0.20,
            stadiumSeatsOpacity: 0.08,
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

    // Stadium look: stands ~15% light / 22% dark; roof membrane ~20% light / 28% dark
    const stadiumLines = isDark ? brandTextTriplet : brandTriplet;
    const stadiumRoof: [number, number, number] = isDark ? [0.12, 0.22, 0.38] : [0.65, 0.75, 0.88];
    const stadiumSeats: [number, number, number] = isDark ? [0.70, 0.80, 0.95] : [0.10, 0.25, 0.45];
    const stadiumFloodlights: [number, number, number] = [1.0, 1.0, 1.0];

    return {
        isDark,
        markings,
        tryLine,
        grass,
        markingsOpacity: 0.32,
        grassOpacity: isDark ? 0.16 : 0.10,
        stadiumLines,
        stadiumRoof,
        stadiumSeats,
        stadiumFloodlights,
        stadiumLinesOpacity: isDark ? 0.22 : 0.15,
        stadiumRoofOpacity: isDark ? 0.28 : 0.20,
        stadiumSeatsOpacity: isDark ? 0.10 : 0.08,
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
