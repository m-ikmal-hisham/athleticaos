/**
 * Country code to country name mapping.
 * Used by the Organisation filters to show real country names
 * instead of organisation names.
 * 
 * Follows ISO 3166-1 alpha-2 codes.
 * Add more countries as the platform expands internationally.
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'ID': 'Indonesia',
    'TH': 'Thailand',
    'PH': 'Philippines',
    'VN': 'Vietnam',
    'BN': 'Brunei',
    'MM': 'Myanmar',
    'KH': 'Cambodia',
    'LA': 'Laos',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'JP': 'Japan',
    'KR': 'South Korea',
    'CN': 'China',
    'HK': 'Hong Kong',
    'TW': 'Taiwan',
    'IN': 'India',
    'LK': 'Sri Lanka',
    'PK': 'Pakistan',
    'GB': 'United Kingdom',
    'IE': 'Ireland',
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'US': 'United States',
    'CA': 'Canada',
    'ZA': 'South Africa',
    'FJ': 'Fiji',
    'WS': 'Samoa',
    'TO': 'Tonga',
};

/**
 * Get a human-readable country name from a country code.
 * Falls back to the code itself if not found in the map.
 */
export const getCountryName = (code: string): string => {
    return COUNTRY_CODE_MAP[code?.toUpperCase()] || code;
};
