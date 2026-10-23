/**
 * Pure helper for identifying and formatting seed synonyms for overall tournament positions.
 *
 * Recognized synonyms match BracketServiceImpl.generateSeedLabels:
 * "seed n", "seedn", "rank n", "ranked n", "position n", "#n", "<ordinal> overall".
 */

const SEED_PREFIX_REGEX = /^(?:seed\s*|rank\s+|ranked\s+|position\s+|#\s*)(\d+)$/i;
const SEED_ORDINAL_REGEX = /^(\d+)(?:st|nd|rd|th)\s+overall$/i;

/**
 * Returns the position n (>= 1) if the label matches a recognized overall/seed synonym,
 * or null if it does not match.
 */
export function parseSeedSynonym(label: string | null | undefined): number | null {
    if (!label) return null;
    const clean = label.trim().replace(/\s+/g, ' ');
    if (!clean) return null;

    const prefixMatch = clean.match(SEED_PREFIX_REGEX);
    if (prefixMatch) {
        const val = parseInt(prefixMatch[1], 10);
        return val > 0 ? val : null;
    }

    const ordinalMatch = clean.match(SEED_ORDINAL_REGEX);
    if (ordinalMatch) {
        const val = parseInt(ordinalMatch[1], 10);
        return val > 0 ? val : null;
    }

    return null;
}

/**
 * Returns the standard canonical placeholder string for an overall position n.
 */
export function formatSeedLabel(n: number): string {
    return `Seed ${n}`;
}
