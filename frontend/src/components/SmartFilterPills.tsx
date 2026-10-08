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
 * A horizontal scrollable list of pill-shaped buttons per STYLE_GUIDE.
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
        const el = scrollRef.current;
        const checkScroll = () => {
            if (!el) return;
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setShowLeftFade(scrollLeft > 0);
            setShowRightFade(scrollLeft < scrollWidth - clientWidth - 5);
        };

        checkScroll();
        el?.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            el?.removeEventListener('scroll', checkScroll);
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
                {/* Clear / All Option */}
                <button
                    onClick={() => onSelect(null)}
                    className={twMerge(
                        "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap",
                        selectedId === null
                            ? "bg-navy text-white border-navy"
                            : "bg-transparent border-black/24 dark:border-white/28 text-black/72 dark:text-white/72 hover:bg-black/4 dark:hover:bg-white/6 hover:text-black dark:hover:text-white"
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
                                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border whitespace-nowrap",
                                isSelected
                                    ? "bg-navy text-white border-navy"
                                    : "bg-transparent border-black/24 dark:border-white/28 text-black/72 dark:text-white/72 hover:bg-black/4 dark:hover:bg-white/6 hover:text-black dark:hover:text-white"
                            )}
                            {...{ "aria-selected": isSelected ? "true" : "false" }}
                            role="tab"
                        >
                            {option.icon && <span className={isSelected ? "text-white" : "text-current"}>{option.icon}</span>}
                            {option.label}
                            {option.count !== undefined && (
                                <span className={twMerge(
                                    "text-xs px-1.5 py-0.5 rounded-full ml-1",
                                    isSelected ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/12 text-black/72 dark:text-white/72"
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
