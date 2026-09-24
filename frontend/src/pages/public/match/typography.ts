/**
 * One text scale for the match centre, so the hero, timeline and lineups use the same few sizes
 * instead of each card picking its own. Each step grows once, at md.
 */
export const matchText = {
    /** Team names in the hero. */
    teamName: 'text-base sm:text-lg md:text-2xl lg:text-3xl font-black tracking-tight leading-tight',
    /** Section and card titles ("Match Moments"). */
    title: 'text-base md:text-lg font-bold',
    /** Names, times, venues: the main reading size. */
    body: 'text-xs md:text-sm',
    /** Pills and badges (tournament, status, event type). */
    chip: 'text-[11px] md:text-xs font-semibold uppercase tracking-wide',
    /** Small captions next to a value (role, position). */
    caption: 'text-[10px] md:text-[11px] font-bold uppercase tracking-wider',
} as const;
