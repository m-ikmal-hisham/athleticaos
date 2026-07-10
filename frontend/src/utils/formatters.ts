
/**
 * Formatting utilities for displaying enum values and other data types user-friendly.
 */

import { TournamentLevel } from "@/types";

/**
 * Formats a competition type enum string into a user-friendly label.
 * Example: 'GROUP_KNOCKOUT' -> 'Group + Knockout'
 */
export const formatCompetitionType = (type: string | undefined | null): string => {
    if (!type) return '';
    switch (type) {
        case 'GROUP_KNOCKOUT':
            return 'Group + Knockout';
        case 'KNOCKOUT':
            return 'Knockout';
        case 'LEAGUE':
            return 'League';
        default:
            return type
                .replace(/_/g, ' ')
                .toLowerCase()
                .replace(/\b\w/g, c => c.toUpperCase());
    }
};

/**
 * Formats a tournament level enum string into Title Case.
 * Example: 'NATIONAL' -> 'National', 'STATE' -> 'State'
 */
export const formatTournamentLevel = (level: string | TournamentLevel | undefined | null): string => {
    if (!level) return '';
    return level
        .toString()
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Formats an event type enum string into Sentence Case.
 * Example: 'YELLOW_CARD' -> 'Yellow Card'
 */
export const formatEventType = (type: string | undefined | null): string => {
    if (!type) return '';
    return type
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Formats a generic enum string into Title Case.
 */
export const formatEnum = (value: string | undefined | null): string => {
    if (!value) return '';
    return value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Formats a gender enum string.
 * Example: 'MALE' -> 'Male', 'FEMALE' -> 'Female', 'MIXED' -> 'Mixed'
 */
export const formatGender = (gender: string | undefined | null): string => {
    if (!gender) return '';
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
};

/**
 * Formats a tournament status enum string.
 * Example: 'ONGOING' -> 'Live', 'UPCOMING' -> 'Upcoming'
 */
export const formatTournamentStatus = (status: string | undefined | null): string => {
    if (!status) return '';
    if (status === 'ONGOING') return 'Live';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * Formats an organisation type enum string.
 * Example: 'NATIONAL_ASSOCIATION' -> 'National Association'
 */
export const formatOrgType = (type: string | undefined | null): string => {
    if (!type) return '';
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Formats a team category enum string.
 * Example: 'CLUB' -> 'Club'
 */
export const formatTeamCategory = (category: string | undefined | null): string => {
    if (!category) return '';
    return category
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Formats an age group string.
 * Example: 'UNDER_18' -> 'Under 18', 'OPEN' -> 'Open'
 */
export const formatAgeGroup = (ageGroup: string | undefined | null): string => {
    if (!ageGroup) return '';
    if (ageGroup === 'OPEN') return 'Open';
    return ageGroup
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Formats a match status enum string.
 * Example: 'ONGOING' -> 'Live', 'SCHEDULED' -> 'Scheduled'
 */
export const formatMatchStatus = (status: string | undefined | null): string => {
    if (!status) return '';
    if (status === 'ONGOING' || status === 'LIVE') return 'Live';
    return status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Generates a short name for a team (3 to 5 characters max).
 */
export const formatTeamShortName = (shortName?: string | null, fullName?: string | null): string => {
    if (shortName && shortName.trim().length > 0) {
        return shortName.trim();
    }
    if (!fullName || fullName.trim().length === 0) {
        return 'TBD';
    }
    
    let clean = fullName.replace(/\b(Rugby|Club|FC|RC|Team|Men's|Women's|boys|girls|open)\b/gi, '').trim();
    if (clean.length === 0) clean = fullName;

    // Use common 3-letter abbreviation pattern if no short name is defined
    return clean.slice(0, 3).toUpperCase();
};



