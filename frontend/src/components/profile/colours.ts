/**
 * Profile Colour Helpers
 * Pure functions for validating hex codes, RGBA conversions,
 * luminance contrast calculation, and organisation colour picking.
 */

export const FALLBACK_PRIMARY = '#0047AB'; // Navy
export const FALLBACK_SECONDARY = '#C1121F'; // Crimson
export const TEXT_ON_DARK = '#FFFFFF';
export const TEXT_ON_LIGHT = '#0D1B2A';

/**
 * Validates whether a string is a 3, 6, or 8 digit hex color code.
 */
export function isValidHex(hex?: string | null): boolean {
    if (!hex || typeof hex !== 'string') return false;
    const clean = hex.trim().replace(/^#/, '');
    return /^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(clean);
}

/**
 * Normalises a hex string into a 6-digit uppercase hex with '#' prefix.
 * Returns null if invalid.
 */
export function normalizeHex(hex?: string | null): string | null {
    if (!isValidHex(hex)) return null;
    let clean = hex!.trim().replace(/^#/, '').toUpperCase();
    if (clean.length === 3) {
        clean = clean.split('').map(c => c + c).join('');
    } else if (clean.length === 8) {
        clean = clean.slice(0, 6);
    }
    return `#${clean}`;
}

/**
 * Converts a hex colour to rgba(...) string with given alpha (0 to 1).
 * Falls back to rgba of fallbackHex if invalid.
 */
export function rgba(hex?: string | null, alpha = 1, fallbackHex = FALLBACK_PRIMARY): string {
    const valid = normalizeHex(hex) || normalizeHex(fallbackHex) || '#0047AB';
    const r = parseInt(valid.slice(1, 3), 16);
    const g = parseInt(valid.slice(3, 5), 16);
    const b = parseInt(valid.slice(5, 7), 16);
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

/**
 * Calculates standard WCAG relative luminance for a given hex colour.
 * sRGB gamma expansion per WCAG 2.1 specs.
 */
export function getLuminance(hex: string): number {
    const valid = normalizeHex(hex) || '#000000';
    const r = parseInt(valid.slice(1, 3), 16) / 255;
    const g = parseInt(valid.slice(3, 5), 16) / 255;
    const b = parseInt(valid.slice(5, 7), 16) / 255;

    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const R = toLinear(r);
    const G = toLinear(g);
    const B = toLinear(b);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Returns either #0D1B2A (Deep Navy) or #FFFFFF depending on which
 * provides readable contrast on the given background colour.
 */
export function readableOn(hex?: string | null): typeof TEXT_ON_LIGHT | typeof TEXT_ON_DARK {
    if (!isValidHex(hex)) return TEXT_ON_DARK;
    const luminance = getLuminance(hex!);
    return luminance > 0.45 ? TEXT_ON_LIGHT : TEXT_ON_DARK;
}

export interface OrgColourSource {
    primaryColor?: string | null;
    secondaryColor?: string | null;
}

/**
 * Picks primary and secondary colours from an organisation record,
 * with fallbacks #0047AB / #C1121F.
 */
export function pickOrgColours(org?: OrgColourSource | null): {
    primary: string;
    secondary: string;
    primaryText: typeof TEXT_ON_LIGHT | typeof TEXT_ON_DARK;
    secondaryText: typeof TEXT_ON_LIGHT | typeof TEXT_ON_DARK;
} {
    const primary = normalizeHex(org?.primaryColor) || FALLBACK_PRIMARY;
    const secondary = normalizeHex(org?.secondaryColor) || FALLBACK_SECONDARY;
    return {
        primary,
        secondary,
        primaryText: readableOn(primary),
        secondaryText: readableOn(secondary),
    };
}
