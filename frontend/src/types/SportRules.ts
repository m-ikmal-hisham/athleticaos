export type SportType = 'RUGBY_UNION' | 'RUGBY_LEAGUE' | 'FOOTBALL' | 'NETBALL';

export interface ScoringValues {
    TRY?: number;
    CONVERSION?: number;
    PENALTY?: number;
    DROP_GOAL?: number;
    GOAL?: number;
    BEHIND?: number;
}

export interface PeriodStructure {
    name: string; // "Half", "Quarter", "Set"
    count: number; // 2, 4
    durationMinutes: number; // 40, 20
}

export interface SportRules {
    id: string;
    sportType: SportType;
    name: string;
    scoring: ScoringValues;
    periods: PeriodStructure;
    cardsEnabled: boolean;
}

// Default Constants
export const RUGBY_UNION_RULES: SportRules = {
    id: 'default-union',
    sportType: 'RUGBY_UNION',
    name: 'Rugby Union (Standard)',
    scoring: {
        TRY: 5,
        CONVERSION: 2,
        PENALTY: 3,
        DROP_GOAL: 3
    },
    periods: {
        name: 'Half',
        count: 2,
        durationMinutes: 40
    },
    cardsEnabled: true
};
