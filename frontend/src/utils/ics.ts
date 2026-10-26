import { PublicTournamentSummary } from '@/api/public.api';
import { parseCalendarDate } from './malaysiaDate';

/**
 * Escapes characters per RFC 5545 section 3.3.11.
 * Backslashes, semicolons, commas, and newlines must be escaped.
 */
function escapeIcsText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
}

/**
 * Folds lines longer than 75 octets per RFC 5545 section 3.1.
 * Subsequent continuation lines begin with a single space.
 */
function foldLine(line: string): string {
    if (line.length <= 75) return line;
    let result = '';
    let remaining = line;
    let first = true;
    while (remaining.length > 0) {
        const maxLen = first ? 75 : 74;
        if (remaining.length <= maxLen) {
            result += (first ? '' : '\r\n ') + remaining;
            break;
        }
        result += (first ? '' : '\r\n ') + remaining.slice(0, maxLen);
        remaining = remaining.slice(maxLen);
        first = false;
    }
    return result;
}

/**
 * Formats a Date as UTC timestamp: YYYYMMDDTHHMMSSZ
 */
function formatUtcStamp(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getUTCFullYear();
    const m = pad(date.getUTCMonth() + 1);
    const d = pad(date.getUTCDate());
    const h = pad(date.getUTCHours());
    const min = pad(date.getUTCMinutes());
    const s = pad(date.getUTCSeconds());
    return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Formats a calendar Date into YYYYMMDD for all-day VALUE=DATE.
 */
function formatIcsDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/**
 * Generates an RFC 5545 compliant iCalendar string for a tournament.
 */
export function generateTournamentIcs(tournament: PublicTournamentSummary): string {
    const startDate = parseCalendarDate(tournament.startDate) ?? new Date();
    const rawEndDate = parseCalendarDate(tournament.endDate) ?? startDate;

    // Per RFC 5545, all-day events require DTEND to be exclusive (end date + 1 day)
    const endDateExclusive = new Date(
        rawEndDate.getFullYear(),
        rawEndDate.getMonth(),
        rawEndDate.getDate() + 1
    );

    const origin =
        typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'https://athleticaos.com';
    const slug = tournament.slug || tournament.id;
    const tournamentUrl = `${origin}/tournaments/${slug}`;

    const summary = tournament.name;
    const location = tournament.venue || '';
    const description = `${tournament.name}\n${location ? `Venue: ${location}\n` : ''}${tournamentUrl}`;
    const dtstamp = formatUtcStamp();
    const uid = `${tournament.id}@athleticaos`;

    const rawLines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AthleticaOS//Rugby//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${formatIcsDate(startDate)}`,
        `DTEND;VALUE=DATE:${formatIcsDate(endDateExclusive)}`,
        `SUMMARY:${escapeIcsText(summary)}`,
        ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
        `URL:${escapeIcsText(tournamentUrl)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ];

    return rawLines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Triggers a download of the tournament .ics file in the browser.
 */
export function downloadTournamentIcs(tournament: PublicTournamentSummary): void {
    const icsContent = generateTournamentIcs(tournament);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = tournament.slug || tournament.id;
    a.download = `${slug}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
