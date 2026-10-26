import { PublicTournamentSummary } from '@/api/public.api';
import { CalendarGridDay, parseCalendarDate } from '@/utils/malaysiaDate';

export interface WeekTournamentSegment {
    tournament: PublicTournamentSummary;
    startCol: number; // 1 to 7 (1-indexed for CSS Grid)
    span: number;     // 1 to 7
    lane: number;     // 0, 1, 2, ...
}

export interface WeekLayoutData {
    weekDays: CalendarGridDay[];
    segments: WeekTournamentSegment[];
    dayOverflow: number[]; // 7 elements
}

export interface ComputeCalendarLayoutOptions {
    maxLanes?: number; // Defaults to 3 for MonthGrid; 2 for CalendarStrip
}

/**
 * Pure helper that splits calendar days into 7-day weeks and assigns tournament
 * horizontal bars to lanes with collision detection and per-day overflow calculation.
 */
export function computeWeekTournamentLayout(
    days: CalendarGridDay[],
    tournaments: PublicTournamentSummary[],
    options: ComputeCalendarLayoutOptions = {}
): WeekLayoutData[] {
    const { maxLanes = 3 } = options;

    // Split days into 7-day weeks
    const weeks: CalendarGridDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    return weeks.map(weekDays => {
        if (weekDays.length === 0) {
            return {
                weekDays: [],
                segments: [],
                dayOverflow: [0, 0, 0, 0, 0, 0, 0],
            };
        }

        const weekStart = weekDays[0].date.getTime();
        const weekEnd = weekDays[weekDays.length - 1].date.getTime();

        // Find tournaments overlapping this week
        const overlapping = tournaments.filter(tr => {
            const s = parseCalendarDate(tr.startDate);
            const e = parseCalendarDate(tr.endDate);
            if (!s || !e) return false;
            return s.getTime() <= weekEnd && e.getTime() >= weekStart;
        });

        // Sort tournaments: live first, then earlier start, then longer duration
        overlapping.sort((a, b) => {
            if (a.live !== b.live) return a.live ? -1 : 1;
            const aStart = parseCalendarDate(a.startDate)?.getTime() ?? 0;
            const bStart = parseCalendarDate(b.startDate)?.getTime() ?? 0;
            if (aStart !== bStart) return aStart - bStart;
            const aEnd = parseCalendarDate(a.endDate)?.getTime() ?? 0;
            const bEnd = parseCalendarDate(b.endDate)?.getTime() ?? 0;
            return bEnd - aEnd;
        });

        // Assign lanes
        const laneOccupied: boolean[][] = []; // laneOccupied[lane][colIndex 0..6]
        const segments: WeekTournamentSegment[] = [];
        const dayOverflow = [0, 0, 0, 0, 0, 0, 0];

        overlapping.forEach(tr => {
            const s = parseCalendarDate(tr.startDate);
            const e = parseCalendarDate(tr.endDate);
            if (!s || !e) return;

            // Determine start and end col in this week (0-indexed)
            let startColIdx = 0;
            while (startColIdx < 7 && weekDays[startColIdx] && weekDays[startColIdx].date.getTime() < s.getTime()) {
                startColIdx++;
            }
            let endColIdx = 6;
            while (endColIdx >= 0 && weekDays[endColIdx] && weekDays[endColIdx].date.getTime() > e.getTime()) {
                endColIdx--;
            }

            if (startColIdx > endColIdx || startColIdx >= 7 || endColIdx < 0) return;
            const span = endColIdx - startColIdx + 1;

            // Find lowest lane that is free for all columns in [startColIdx, endColIdx]
            let lane = 0;
            let assigned = false;
            while (!assigned) {
                if (!laneOccupied[lane]) {
                    laneOccupied[lane] = [false, false, false, false, false, false, false];
                }
                let fits = true;
                for (let c = startColIdx; c <= endColIdx; c++) {
                    if (laneOccupied[lane][c]) {
                        fits = false;
                        break;
                    }
                }
                if (fits) {
                    for (let c = startColIdx; c <= endColIdx; c++) {
                        laneOccupied[lane][c] = true;
                    }
                    assigned = true;
                    break;
                }
                lane++;
            }

            if (lane < maxLanes) {
                segments.push({
                    tournament: tr,
                    startCol: startColIdx + 1, // 1-indexed for CSS grid
                    span,
                    lane,
                });
            } else {
                // Overflows max visible lanes
                for (let c = startColIdx; c <= endColIdx; c++) {
                    dayOverflow[c]++;
                }
            }
        });

        return {
            weekDays,
            segments,
            dayOverflow,
        };
    });
}
