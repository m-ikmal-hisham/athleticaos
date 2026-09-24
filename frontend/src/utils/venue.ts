/**
 * Utility functions for tournament venue handling and match numbering labels.
 */

/**
 * Normalises a venue string for grouping and database index matching.
 * Trims whitespace; treats null and blank as empty string "".
 * Comparison is exact after trimming without case folding.
 */
export const normalizeVenue = (venue?: string | null): string => {
    if (!venue) return '';
    const trimmed = venue.trim();
    return trimmed;
};

/**
 * Checks whether a tournament has two or more distinct assigned venues in its matches.
 */
export const hasMultipleVenues = (matches?: { venueId?: string | null; venue?: string | null }[] | null): boolean => {
    if (!matches || matches.length === 0) return false;
    const venues = new Set<string>();
    for (const m of matches) {
        const id = m.venueId || normalizeVenue(m.venue);
        if (id.length > 0) {
            venues.add(id);
        }
    }
    return venues.size >= 2;
};

/**
 * Formats a match number label, appending the venue when the tournament uses multiple venues.
 * Example with multiple venues: "Match 12 · Venue B - Pitch A"
 * Example with single/no venue: "Match 12"
 */
export const formatMatchVenueLabel = (
    matchNumber?: number | null,
    venue?: string | null,
    multipleVenues: boolean = false,
    prefix: string = 'Match '
): string => {
    if (matchNumber === undefined || matchNumber === null) {
        return '';
    }
    const base = `${prefix}${matchNumber}`;
    if (!multipleVenues) {
        return base;
    }
    const venueName = venue && venue.trim().length > 0 ? venue.trim() : 'Venue TBC';
    return `${base} · ${venueName}`;
};

/**
 * Formats a feeder placeholder string, appending the feeder's venue when it is at a different venue
 * than the target match.
 * Example: "Lose 77 (Venue B)" when target is at Venue A and feeder match 77 is at Venue B.
 * If at the same venue: unchanged ("Lose 77").
 */
export const formatFeederPlaceholder = (
    placeholder?: string | null,
    targetVenue?: string | null,
    matches?: { id?: string; matchNumber?: number | null; matchCode?: string | null; venueId?: string | null; venueName?: string | null; venue?: string | null }[] | null,
    feederMatchId?: string | null,
    targetVenueId?: string | null
): string => {
    if (!placeholder && !feederMatchId) return '';
    const raw = (placeholder || '').trim();

    let feederMatch = feederMatchId && matches ? matches.find(m => m.id === feederMatchId) : undefined;

    if (!feederMatch && raw && matches) {
        const matchRegex = /^(Lose|Loser|Win|Winner)\s+([A-Za-z0-9_-]+)/i.exec(raw);
        if (matchRegex) {
            const token = matchRegex[2];
            const num = Number(token);
            if (!Number.isNaN(num)) {
                feederMatch = matches.find(m => m.matchNumber === num);
            }
            if (!feederMatch) {
                feederMatch = matches.find(m => m.matchCode && m.matchCode.toUpperCase() === token.toUpperCase());
            }
        }
    }

    if (!feederMatch) {
        return raw;
    }

    const feederVenueName = feederMatch.venueName || normalizeVenue(feederMatch.venue);
    let isCrossVenue = false;
    if (feederMatch.venueId && targetVenueId) {
        isCrossVenue = feederMatch.venueId !== targetVenueId;
    } else {
        const normFeederVenue = normalizeVenue(feederVenueName);
        const normTargetVenue = normalizeVenue(targetVenue);
        isCrossVenue = normFeederVenue.length > 0 && normFeederVenue !== normTargetVenue;
    }

    // Always rebuild from the feeder's CURRENT number. Stored placeholders carry the feeder's match
    // code, which never changes; numbers run per venue and move whenever a tournament is renumbered.
    const outcome = /^(Lose|Loser|Win|Winner)\b/i.exec(raw);
    const prefix = outcome ? outcome[1] : 'Winner';
    const id = feederMatch.matchNumber != null ? String(feederMatch.matchNumber) : (feederMatch.matchCode || '');
    const base = id ? `${prefix} ${id}` : prefix;

    return isCrossVenue ? `${base} (${feederVenueName || 'Venue TBC'})` : base;
};
