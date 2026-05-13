/**
 * Lightweight page-level loading indicator for React.lazy() Suspense fallback.
 * Designed to be visually consistent with the app's glassmorphism design system.
 */
export const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Loading…</span>
        </div>
    </div>
);

export default PageLoader;
