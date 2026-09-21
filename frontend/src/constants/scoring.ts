/**
 * Points awarded per match event type.
 *
 * This mirrors StatisticsServiceImpl.getPointsForEventType on the backend, which
 * is the authority for the stored match score. Keep the two in step — the UI only
 * ever displays these numbers, it never decides the scoreline.
 */
export const SCORING_RULES: Record<string, number> = {
    TRY: 5,
    SUPER_TRY: 7,
    PENALTY_TRY: 7,
    CONVERSION: 2,
    PENALTY: 3,
    DROP_GOAL: 3,
    YELLOW_CARD: 0,
    RED_CARD: 0,
    SUBSTITUTION: 0,
    INJURY: 0,
    SCRUM: 0,
    LINEOUT: 0,
    OTHER: 0,
};

/** Event types that put points on the board. */
export const SCORING_EVENT_TYPES = ['TRY', 'SUPER_TRY', 'PENALTY_TRY', 'CONVERSION', 'PENALTY', 'DROP_GOAL'] as const;

/** Event types tallied as a try — a super try is a try worth 7 rather than 5. */
export const TRY_EVENT_TYPES = ['TRY', 'SUPER_TRY'] as const;

export const getEventPoints = (eventType?: string | null): number => {
    if (!eventType) return 0;
    return SCORING_RULES[eventType.toUpperCase()] ?? 0;
};

export const isScoringEvent = (eventType?: string | null): boolean => getEventPoints(eventType) > 0;
