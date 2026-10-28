import { GlassCard } from '@/components/GlassCard';

/**
 * Single MatchCard skeleton mirroring MatchCard.tsx markup 1:1.
 * Same container, padding, flex rows, logo boxes, center score cell, and meta row.
 */
export function MatchCardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div className="block rounded-[14px]">
            <GlassCard surface="glass" className={`p-4 rounded-[14px] min-h-[44px] ${className}`}>
                <div className="flex flex-col gap-2.5 w-full animate-pulse" aria-hidden="true">
                    {/* Main Score Row: Home Team - Score/Time - Away Team */}
                    <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
                        {/* Home Team */}
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-sunken border border-line-subtle shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="h-3.5 sm:h-4 w-20 sm:w-28 rounded bg-surface-sunken" />
                            </div>
                        </div>

                        {/* Center Score / Kick-off cell */}
                        <div className="shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] px-2.5 py-1 rounded-[8px] bg-surface-sunken select-none">
                            <div className="h-6 sm:h-7 w-8 rounded bg-line-subtle/50" />
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0 text-right">
                            <div className="min-w-0 flex-1 flex justify-end">
                                <div className="h-3.5 sm:h-4 w-20 sm:w-28 rounded bg-surface-sunken" />
                            </div>
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-sunken border border-line-subtle shrink-0" />
                        </div>
                    </div>

                    {/* Meta Line: Badge · Venue · Code */}
                    <div className="flex items-center justify-between gap-2 text-xs text-content-secondary pt-2 border-t border-line-subtle/50">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <div className="h-[22px] w-12 rounded bg-surface-sunken" />
                            <span className="opacity-40" aria-hidden="true">•</span>
                            <div className="h-3 w-24 sm:w-32 rounded bg-surface-sunken" />
                        </div>
                        <div className="hidden sm:inline h-3 w-10 rounded bg-surface-sunken" />
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}

function TournamentGroupHeaderSkeleton() {
    return (
        <div className="inline-flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-surface-sunken border border-line-subtle shrink-0 animate-pulse" />
            <div className="h-4 w-40 rounded bg-surface-sunken animate-pulse" />
        </div>
    );
}

/**
 * Feed placeholder mirroring loaded match markup:
 * Two tournament group headers, each followed by half the cards
 * (phones 2 + 2, >= 768 px 3 + 3), plus the 44px button space,
 * so a capped list spanning two tournaments is not taller than the reference.
 * Used both for the loading state and as the invisible min-height reference.
 */
export function MatchFeedSkeleton() {
    return (
        <div aria-hidden="true" className="space-y-6">
            {/* Tournament Group 1 */}
            <div className="space-y-2.5">
                <TournamentGroupHeaderSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    <MatchCardSkeleton />
                    <MatchCardSkeleton />
                    <div className="hidden md:block">
                        <MatchCardSkeleton />
                    </div>
                </div>
            </div>

            {/* Tournament Group 2 */}
            <div className="space-y-2.5">
                <TournamentGroupHeaderSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                    <MatchCardSkeleton />
                    <MatchCardSkeleton />
                    <div className="hidden md:block">
                        <MatchCardSkeleton />
                    </div>
                </div>
            </div>

            {/* "Show all matches (n)" Button Space */}
            <div className="pt-2 text-center">
                <div className="inline-block h-[44px] w-52 rounded-[10px] bg-surface-card border border-line-subtle animate-pulse" />
            </div>
        </div>
    );
}

export default MatchFeedSkeleton;

