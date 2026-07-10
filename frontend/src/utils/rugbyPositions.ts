/**
 * Rugby Position Mapping Utility
 * Maps orderIndex (jersey number position in lineup) to World Rugby standard position names.
 */

export type RugbyFormat = 'XV' | 'SEVENS' | 'TENS' | 'TOUCH';

// World Rugby standard XV positions
const XV_POSITIONS: Record<number, string> = {
    1: 'Loosehead Prop',
    2: 'Hooker',
    3: 'Tighthead Prop',
    4: 'Lock',
    5: 'Lock',
    6: 'Blindside Flanker',
    7: 'Openside Flanker',
    8: 'Number 8',
    9: 'Scrumhalf',
    10: 'Flyhalf',
    11: 'Left Wing',
    12: 'Inside Centre',
    13: 'Outside Centre',
    14: 'Right Wing',
    15: 'Fullback',
};

// World Rugby standard Sevens positions
const SEVENS_POSITIONS: Record<number, string> = {
    1: 'Prop',
    2: 'Hooker',
    3: 'Prop',
    4: 'Flyhalf',
    5: 'Scrumhalf',
    6: 'Wing',
    7: 'Wing',
};

// Tens positions (loosely defined)
const TENS_POSITIONS: Record<number, string> = {
    1: 'Loosehead Prop',
    2: 'Hooker',
    3: 'Tighthead Prop',
    4: 'Lock',
    5: 'Flanker',
    6: 'Scrumhalf',
    7: 'Flyhalf',
    8: 'Centre',
    9: 'Wing',
    10: 'Fullback',
};

/**
 * Get the position name for a given orderIndex and rugby format.
 * Falls back to "Player #N" if no mapping exists.
 */
export function getPositionName(orderIndex: number | undefined | null, format: RugbyFormat = 'XV'): string {
    if (orderIndex == null || orderIndex <= 0) return '';

    let positions: Record<number, string>;

    switch (format) {
        case 'SEVENS':
            positions = SEVENS_POSITIONS;
            break;
        case 'TENS':
            positions = TENS_POSITIONS;
            break;
        case 'XV':
        default:
            positions = XV_POSITIONS;
            break;
    }

    return positions[orderIndex] || `Player #${orderIndex}`;
}

/**
 * Get the position group (Forwards / Backs) for a given orderIndex.
 * Standard: XV Forwards = 1-8, Backs = 9-15
 *           Sevens Forwards = 1-3, Backs = 4-7
 */
export function getPositionGroup(orderIndex: number | undefined | null, format: RugbyFormat = 'XV'): 'Forwards' | 'Backs' | '' {
    if (orderIndex == null || orderIndex <= 0) return '';

    switch (format) {
        case 'SEVENS':
            return orderIndex <= 3 ? 'Forwards' : 'Backs';
        case 'TENS':
            return orderIndex <= 5 ? 'Forwards' : 'Backs';
        case 'XV':
        default:
            return orderIndex <= 8 ? 'Forwards' : 'Backs';
    }
}

/**
 * Get the starters count for a format.
 */
export function getStartersCount(format: RugbyFormat = 'XV'): number {
    switch (format) {
        case 'SEVENS': return 7;
        case 'TENS': return 10;
        case 'XV':
        default: return 15;
    }
}

/**
 * Format official role name from raw enum-like strings.
 * E.g., "ASSISTANT_REFEREE_1" -> "Assistant Referee 1"
 *        "FOURTH_OFFICIAL" -> "Fourth Official"
 *        "REFEREE" -> "Referee"
 * Also handles already-formatted names gracefully.
 */
export function formatOfficialRole(role: string | undefined | null): string {
    if (!role) return '';

    // If it contains underscores, it's a raw enum — format it
    if (role.includes('_')) {
        return role
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Already formatted or a plain name
    return role;
}
