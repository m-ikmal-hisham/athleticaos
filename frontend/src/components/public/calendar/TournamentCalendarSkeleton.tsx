import { PhoneWeekAgendaSkeleton } from './PhoneWeekAgendaSkeleton';

export function TournamentCalendarSkeleton() {
    return (
        <div className="space-y-4" aria-hidden="true">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-[14px] bg-surface-card border border-line-subtle">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[10px] bg-surface-sunken animate-pulse" />
                    <div className="w-36 h-6 rounded-md bg-surface-sunken animate-pulse" />
                    <div className="w-9 h-9 rounded-[10px] bg-surface-sunken animate-pulse" />
                    <div className="w-16 h-8 rounded-[10px] bg-surface-sunken ml-2 animate-pulse" />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="w-24 h-9 rounded-[10px] bg-surface-sunken animate-pulse" />
                    <div className="w-24 h-9 rounded-[10px] bg-surface-sunken animate-pulse" />
                </div>
            </div>

            {/* Grid Skeleton (Desktop) */}
            <div className="hidden lg:grid grid-cols-7 gap-px rounded-[14px] overflow-hidden border border-line-subtle bg-line-subtle">
                {/* Weekday headers */}
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={`head-${i}`} className="h-10 bg-surface-sunken animate-pulse" />
                ))}
                {/* 35 day cells */}
                {Array.from({ length: 35 }).map((_, i) => (
                    <div key={`cell-${i}`} className="min-h-[110px] p-2 bg-surface-card flex flex-col justify-between">
                        <div className="w-6 h-6 rounded-full bg-surface-sunken animate-pulse" />
                        <div className="space-y-1">
                            <div className="w-full h-4 rounded bg-surface-sunken animate-pulse" />
                            <div className="w-3/4 h-4 rounded bg-surface-sunken animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Phone Skeleton */}
            <div className="lg:hidden">
                <PhoneWeekAgendaSkeleton />
            </div>
        </div>
    );
}
