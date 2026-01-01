import { useMemo } from 'react';
import { Warning } from '@phosphor-icons/react';
import { GlassCard } from '@/components/GlassCard';
import { PublicMatchDetail } from '../../../api/public.api';

interface DisciplineImpactCardProps {
    match: PublicMatchDetail;
}

export const DisciplineImpactCard = ({ match }: DisciplineImpactCardProps) => {
    // Calculate Discipline Impact
    const impact = useMemo(() => {
        if (!match.events) return { home: { minutes: 0, pointsConceded: 0 }, away: { minutes: 0, pointsConceded: 0 } };

        const calculateTeamImpact = (teamName: string) => {
            let disadvantageMinutes = 0;
            let pointsConceded = 0;
            const windows: { start: number; end: number }[] = [];

            // 1. Identify Disadvantage Windows
            match.events.forEach(event => {
                if (event.teamName === teamName) { // My team got a card
                    if (event.eventType === 'YELLOW_CARD') {
                        const start = event.minute || 0;
                        windows.push({ start, end: start + 10 });
                    } else if (event.eventType === 'RED_CARD') {
                        const start = event.minute || 0;
                        windows.push({ start, end: 80 }); // Assumes 80min match
                    }
                }
            });

            // Merge overlapping windows to calculate total minutes correctly
            // Sort by start
            windows.sort((a, b) => a.start - b.start);
            const mergedWindows: { start: number; end: number }[] = [];

            if (windows.length > 0) {
                let current = windows[0];
                for (let i = 1; i < windows.length; i++) {
                    const next = windows[i];
                    if (next.start < current.end) {
                        current.end = Math.max(current.end, next.end);
                    } else {
                        mergedWindows.push(current);
                        current = next;
                    }
                }
                mergedWindows.push(current);
            }

            // Sum minutes
            mergedWindows.forEach(w => {
                // Cap at 80 mins
                const end = Math.min(w.end, 80);
                disadvantageMinutes += (end - w.start);
            });

            // 2. Calculate Points Conceded during these windows
            match.events.forEach(event => {
                if (event.teamName !== teamName) { // Opponent scored
                    // Check if *any* window covers this event
                    const time = event.minute || 0;
                    const isDuringWindow = mergedWindows.some(w => time >= w.start && time <= w.end);

                    if (isDuringWindow) {
                        let pts = 0;
                        switch (event.eventType.toUpperCase()) {
                            case 'TRY': pts = 5; break;
                            case 'CONVERSION': pts = 2; break;
                            case 'PENALTY': pts = 3; break;
                            case 'DROP_GOAL': pts = 3; break;
                            case 'PENALTY_TRY': pts = 7; break;
                        }
                        pointsConceded += pts;
                    }
                }
            });

            return { minutes: disadvantageMinutes, pointsConceded };
        };

        return {
            home: calculateTeamImpact(match.homeTeamName),
            away: calculateTeamImpact(match.awayTeamName)
        };

    }, [match.events, match.homeTeamName, match.awayTeamName]);

    // Only render if there were actual cards/disadvantage
    if (impact.home.minutes === 0 && impact.away.minutes === 0) return null;

    const renderTeamSection = (teamName: string, data: { minutes: number; pointsConceded: number }, color: string) => {
        if (data.minutes === 0) return null;

        return (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        ref={(el) => { if (el) el.style.backgroundColor = color; }}
                    />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{teamName}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-1">
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Time w/ 14 men</span>
                        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.minutes}'</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Points Conceded</span>
                        <span className="text-lg font-bold text-red-500 flex items-center gap-1">
                            -{data.pointsConceded}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const homeColor = match.organiserBranding?.primaryColor || '#3b82f6';
    const awayColor = match.organiserBranding?.secondaryColor || '#ef4444';

    return (
        <GlassCard className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Warning className="w-5 h-5 text-orange-500" />
                Discipline Impact
            </h3>

            <div className="space-y-4">
                {renderTeamSection(match.homeTeamName, impact.home, homeColor)}
                {renderTeamSection(match.awayTeamName, impact.away, awayColor)}

                <div className="text-xs text-slate-400 mt-2 text-center italic">
                    Impact tracks points lost while players were in the sin bin.
                </div>
            </div>
        </GlassCard>
    );
};
