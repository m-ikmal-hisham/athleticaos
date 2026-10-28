// Mirrors CalendarStrip's markup (same containers, paddings and fixed heights) so the
// strip does not change height when it replaces this placeholder. Keep the two in step.
export function CalendarStripSkeleton() {
    return (
        <section aria-hidden="true" className="space-y-4">
            {/* Header: icon + title, link to the full calendar (44px tap target below lg) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-surface-sunken animate-pulse" />
                    <div className="h-7 md:h-8 w-40 rounded-md bg-surface-sunken animate-pulse" />
                </div>
                <div className="h-11 lg:h-5 w-28 rounded-md bg-surface-sunken animate-pulse" />
            </div>

            {/* Desktop (>= 1024px): weekday row + 3 week rows of 92px */}
            <div className="hidden lg:block">
                <div className="rounded-[14px] overflow-hidden border border-line-subtle bg-line-subtle shadow-xs">
                    <div className="grid grid-cols-7 bg-surface-sunken border-b border-line-subtle">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="py-2 flex justify-center">
                                <div className="h-4 w-8 rounded bg-surface-card animate-pulse" />
                            </div>
                        ))}
                    </div>
                    <div className="space-y-px">
                        {[0, 1, 2].map((weekIdx) => (
                            <div key={weekIdx} className="relative grid grid-cols-7 gap-px bg-line-subtle min-h-[92px]">
                                {Array.from({ length: 7 }).map((_, colIdx) => (
                                    <div key={colIdx} className="relative p-1.5 flex flex-col justify-between bg-surface-card">
                                        <div className="w-6 h-6 rounded-full bg-surface-sunken animate-pulse" />
                                        <div className="h-[46px]" />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Phone (< 1024px): week strip card + selected day agenda (one tournament, two matches) */}
            <div className="lg:hidden space-y-3">
                <div className="p-3 rounded-[14px] bg-surface-card border border-line-subtle shadow-xs space-y-3">
                    <div className="flex items-center justify-between h-11">
                        <div className="flex items-center gap-1.5">
                            <div className="w-10 h-10 rounded-[10px] bg-surface-sunken animate-pulse" />
                            <div className="w-10 h-10 rounded-[10px] bg-surface-sunken animate-pulse" />
                            <div className="w-28 h-5 rounded-md bg-surface-sunken animate-pulse ml-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="py-2 px-1 rounded-[10px] flex flex-col items-center gap-1 min-h-[44px] bg-surface-sunken animate-pulse">
                                <div className="h-[11px]" />
                                <div className="h-[14px]" />
                                <div className="h-1.5" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-3.5 rounded-[14px] bg-surface-card border border-line-subtle space-y-4">
                    <div className="h-4 w-36 rounded bg-surface-sunken animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-24 rounded bg-surface-sunken animate-pulse" />
                        <div className="min-h-[44px] rounded-[10px] bg-surface-sunken animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-20 rounded bg-surface-sunken animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                            <div className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CalendarStripSkeleton;
