
import { clsx } from "clsx";

interface SkeletonProps {
    className?: string;
    count?: number;
    height?: string;
}

export function LoadingSkeleton({ className, count = 1, height = "h-4" }: SkeletonProps) {
    return (
        <div className="space-y-2 animate-pulse w-full">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={clsx(
                        "bg-white/5 rounded-md",
                        height,
                        className
                    )}
                />
            ))}
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="w-full space-y-4">
            <div className="flex gap-4 mb-6">
                <LoadingSkeleton className="w-1/4 h-10" />
                <LoadingSkeleton className="w-1/6 h-10" />
            </div>
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        {Array.from({ length: cols }).map((_, j) => (
                            <LoadingSkeleton key={j} className="flex-1 h-12" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
