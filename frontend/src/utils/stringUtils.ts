/**
 * Formats a role enum value into a user-friendly string.
 * Example: ROLE_SUPER_ADMIN -> Super Admin, ORG_ADMIN -> Organisation Admin
 */
export const formatRoleName = (role: string): string => {
    if (!role) return '';

    // Remove ROLE_ prefix if present
    const cleanRole = role.replace(/^ROLE_/, '');

    switch (cleanRole) {
        case 'SUPER_ADMIN':
            return 'Super Admin';
        case 'ORG_ADMIN':
            return 'Organisation Admin';
        case 'CLUB_ADMIN':
            return 'Club Admin';
        case 'TEAM_MANAGER':
            return 'Team Manager';
        case 'COACH':
            return 'Coach';
        case 'PLAYER':
            return 'Player';
        case 'TEAM_MEDICAL':
            return 'Team Medical';
        case 'ORG_MEDICAL':
            return 'Organisation Medical';
        case 'CLUB_MEDICAL':
            return 'Club Medical';
        default:
            // Fallback: Replace underscores with spaces and title case
            return cleanRole
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
    }
};

export const slugify = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};
