import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface BentoGridProps {
    children: ReactNode;
    className?: string;
}

interface BentoItemProps {
    children: ReactNode;
    className?: string;
    colSpan?: number;
    rowSpan?: number;
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
    return (
        <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]', className)}>
            {children}
        </div>
    );
};

export const BentoItem = ({ children, className, colSpan = 1, rowSpan = 1 }: BentoItemProps) => {
    return (
        <div
            className={clsx(
                'min-h-[200px] h-full',
                colSpan > 1 && `md:col-span-2 lg:col-span-${colSpan}`,
                rowSpan > 1 && `row-span-${rowSpan}`,
                className
            )}
        >
            {children}
        </div>
    );
};
