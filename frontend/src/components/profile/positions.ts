export type PositionUnit = 'FORWARDS' | 'BACKS';

export function getUnitCategory(
    position?: string | null,
    jerseyNumber?: number | null
): PositionUnit | null {
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
        if (jerseyNumber >= 1 && jerseyNumber <= 8) return 'FORWARDS';
        if (jerseyNumber >= 9 && jerseyNumber <= 15) return 'BACKS';
    }
    if (!position) return null;
    const p = position.toLowerCase();
    if (
        p.includes('prop') ||
        p.includes('hooker') ||
        p.includes('lock') ||
        p.includes('flanker') ||
        p.includes('eight') ||
        p.includes('no.8') ||
        p.includes('no 8') ||
        p.includes('second row')
    ) {
        return 'FORWARDS';
    }
    if (
        p.includes('half') ||
        p.includes('centre') ||
        p.includes('center') ||
        p.includes('wing') ||
        p.includes('fullback') ||
        p.includes('full back')
    ) {
        return 'BACKS';
    }
    return null;
}
