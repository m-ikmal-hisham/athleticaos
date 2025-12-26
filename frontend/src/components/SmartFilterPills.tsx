import { useRef, useState, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';


export interface FilterOption {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface SmartFilterPillsProps {
    options: FilterOption[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    label?: string; // Optional label "Filter by status..."
    className?: string;
}

/**
 * SmartFilterPills
 * A horizontal scrollable list of pill-shaped buttons.
 * Inspired by Apple Music/iOS filters.
 */
export const SmartFilterPills = ({
    options,
    selectedId,
    onSelect,
    label,
    className
}: SmartFilterPillsProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    // Initial check for scroll indicators
    useEffect(() => {
        const checkScroll = () => {
            if (!scrollRef.current) return;
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setShowLeftFade(scrollLeft > 0);
            setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5);
        };

        checkScroll();
        scrollRef.current?.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            scrollRef.current?.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [options]);

    return (
        <div className={twMerge("relative group", className)}>
            {/* Scroll Indicators (Fades) */}
            <div className={twMerge(
                "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-300",
                showLeftFade ? "opacity-100" : "opacity-0"
            )} />
            <div className={twMerge(
                "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-300",
                showRightFade ? "opacity-100" : "opacity-0"
            )} />

            <div
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
                role="tablist"
                aria-label={label || "Filters"}
            >
                {/* Clear / All Option - Implicitly 'null' or explicitly 'ALL' depending on usage. 
                    Here we treat 'null' as 'All'. */}
                <button
                    onClick={() => onSelect(null)}
                    className={twMerge(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border scale-100 active:scale-95 whitespace-nowrap",
                        selectedId === null
                            ? "bg-foreground text-background border-foreground shadow-sm"
                            : "bg-glass-bg border-glass-border text-muted-foreground hover:bg-glass-border/50 hover:text-foreground"
                    )}
                    {...{ "aria-selected": selectedId === null ? "true" : "false" }}
                    role="tab"
                >
                    All
                </button>

                {options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => onSelect(option.id)}
                            className={twMerge(
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 border scale-100 active:scale-95 whitespace-nowrap",
                                isSelected
                                    ? "bg-primary-500 text-white border-primary-500 shadow-md shadow-primary-500/20"
                                    : "bg-glass-bg border-glass-border text-muted-foreground hover:bg-glass-border/50 hover:text-foreground hover:border-glass-border"
                            )}
                            {...{ "aria-selected": isSelected ? "true" : "false" }}
                            role="tab"
                        >
                            {option.icon && <span className={isSelected ? "text-white" : "text-current"}>{option.icon}</span>}
                            {option.label}
                            {option.count !== undefined && (
                                <span className={twMerge(
                                    "text-[10px] px-1.5 py-0.5 rounded-full ml-1",
                                    isSelected ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10"
                                )}>
                                    {option.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
