import type { TFunction } from 'i18next';

export type EnumLabelGroup =
    | 'status'
    | 'stage'
    | 'competitionType'
    | 'level'
    | 'category'
    | 'ageGroup'
    | 'tier';

/** 'GROUP_KNOCKOUT' / 'group knockout' -> 'Group Knockout'; 'U11' stays 'U11'. */
export function tidyEnum(value: string): string {
    return value
        .trim()
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b([a-z])/g, (c) => c.toUpperCase())
        .replace(/\bU(\d+)\b/gi, 'U$1');
}

// Match statuses arrive in several spellings; the common.json keys are camelCase.
const STATUS_KEYS: Record<string, string> = {
    LIVE: 'live',
    ONGOING: 'live',
    IN_PROGRESS: 'live',
    COMPLETED: 'completed',
    FINISHED: 'completed',
    FULL_TIME: 'fullTime',
    SCHEDULED: 'scheduled',
    UPCOMING: 'upcoming',
    CANCELLED: 'cancelled',
    POSTPONED: 'postponed',
    DELAYED: 'delayed',
    WALKOVER: 'walkover',
    BYE: 'bye',
};

/**
 * Label for a value from the database or an enum (status, stage, level, team category…), in the
 * current language. Looks up common:<group>.<VALUE>; free-text values without a key (e.g. a team
 * category typed by an organiser) fall back to the tidied value, never to a raw i18n key.
 */
export function enumLabel(t: TFunction, group: EnumLabelGroup, value: string | null | undefined): string {
    if (!value) return '';
    const upper = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const key = group === 'status' ? STATUS_KEYS[upper] ?? upper.toLowerCase() : upper;
    return t(`common:${group}.${key}`, { defaultValue: tidyEnum(value) }) as string;
}
