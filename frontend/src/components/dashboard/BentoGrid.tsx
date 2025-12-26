import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BentoGridProps {
    children: ReactNode;
    className?: string;
}

interface BentoItemProps {
    children: ReactNode;
    className?: string;
    colSpan?: number; // 1 to 4
    rowSpan?: number; // 1 to 3
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
    return (
        <div className={clsx(
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]",
            className
        )}>
            {children}
        </div>
    );
};

export const BentoItem = ({ children, className, colSpan = 1, rowSpan = 1 }: BentoItemProps) => {
    return (
        <div className={clsx(
            "rounded-[20px] overflow-hidden relative", // Unified rounded corners
            "transition-all duration-300",
            // Responsive Column Spans
            colSpan === 1 && "lg:col-span-1",
            colSpan === 2 && "lg:col-span-2",
            colSpan === 3 && "lg:col-span-3",
            colSpan === 4 && "lg:col-span-4",
            // Responsive Row Spans
            rowSpan === 1 && "lg:row-span-1",
            rowSpan === 2 && "lg:row-span-2",
            rowSpan === 3 && "lg:row-span-3",
            className
        )}>
            {children}
        </div>
    );
};
