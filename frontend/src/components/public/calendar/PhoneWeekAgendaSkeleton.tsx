// Kept in its own file (no imports) so pages can show it without loading the agenda chunk.
export function PhoneWeekAgendaSkeleton() {
    return (
        <div aria-hidden="true" className="space-y-4">
            {/* Week Strip Container */}
            <div className="p-3 rounded-[14px] bg-surface-card border border-line-subtle shadow-xs space-y-3">
                {/* Week Strip Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <div className="w-10 h-10 rounded-[10px] bg-surface-sunken animate-pulse" />
                        <div className="w-10 h-10 rounded-[10px] bg-surface-sunken animate-pulse" />
                        <div className="w-28 h-5 rounded-md bg-surface-sunken animate-pulse ml-1" />
                    </div>

                    <div className="min-h-[40px] w-20 rounded-[10px] bg-surface-sunken animate-pulse" />
                </div>

                {/* 7 Day Strip Buttons */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="min-h-[56px] py-1.5 px-0.5 rounded-[10px] flex flex-col items-center justify-between bg-surface-sunken animate-pulse"
                        >
                            <div className="w-4 h-3 rounded bg-surface-card" />
                            <div className="w-4 h-4 rounded bg-surface-card" />
                            <div className="h-2" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Agenda List grouped by day */}
            <div className="space-y-3">
                {/* 1 Expanded Day Shell */}
                <div className="rounded-[14px] bg-surface-card border border-line-subtle shadow-xs overflow-hidden">
                    <div className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand" />
                            <div className="h-4 w-32 rounded bg-surface-sunken animate-pulse" />
                            <div className="h-5 w-12 rounded-full bg-brand/10" />
                        </div>
                        <div className="w-4 h-4 rounded bg-surface-sunken animate-pulse" />
                    </div>
                    <div className="p-4 pt-1 border-t border-line-subtle space-y-4">
                        <div className="space-y-2">
                            <div className="h-3 w-20 rounded bg-surface-sunken animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                                <div className="h-14 rounded-[10px] bg-surface-sunken animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6 Collapsed Days Shell */}
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-[14px] bg-surface-card border border-line-subtle shadow-xs overflow-hidden"
                    >
                        <div className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-transparent" />
                                <div className="h-4 w-28 rounded bg-surface-sunken animate-pulse" />
                            </div>
                            <div className="w-4 h-4 rounded bg-surface-sunken animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
