/**
 * The age groups a team can be registered under.
 *
 * Single source of truth for the age-group dropdowns (create team, edit team and
 * the team modal). `Team.ageGroup` is a free-text column on the backend, so this
 * list is what actually defines the vocabulary — keep it in step with the
 * `AgeGroup` enum in `@/types`.
 */
export interface AgeGroupOption {
    value: string;
    label: string;
}

const underAgeGroup = (age: number): AgeGroupOption => ({ value: `U${age}`, label: `Under ${age}` });

/** Under 6 through Under 23, with no gaps. */
export const UNDER_AGE_GROUP_OPTIONS: AgeGroupOption[] = Array.from(
    { length: 23 - 6 + 1 },
    (_, index) => underAgeGroup(6 + index),
);

export const VETERAN_AGE_GROUP_OPTIONS: AgeGroupOption[] = [
    { value: 'O35', label: 'Over 35' },
    { value: 'O38', label: 'Over 38' },
    { value: 'O40', label: 'Over 40' },
];

export const AGE_GROUP_OPTIONS: AgeGroupOption[] = [
    { value: 'SENIOR', label: 'Open (Senior)' },
    ...UNDER_AGE_GROUP_OPTIONS,
    ...VETERAN_AGE_GROUP_OPTIONS,
];
