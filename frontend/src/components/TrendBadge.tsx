import React from 'react';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { clsx } from 'clsx';

interface TrendBadgeProps {
    value: number;
    className?: string;
    showIcon?: boolean;
    inverse?: boolean; // If true, decreasing is good (green), increasing is bad (red)
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ 
    value, 
    className, 
    showIcon = true,
    inverse = false 
}) => {
    const isNeutral = value === 0;
    const isIncreasing = value > 0;
    
    // Determine color based on trend and inverse flag
    const getColors = () => {
        if (isNeutral) return 'text-slate-500 bg-slate-500/10 dark:text-slate-400 dark:bg-slate-400/10';
        
        if (isIncreasing) {
            return inverse 
                ? 'text-red-500 bg-red-500/10 dark:text-red-400 dark:bg-red-400/10' 
                : 'text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10';
        } else {
            return inverse 
                ? 'text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/10' 
                : 'text-red-500 bg-red-500/10 dark:text-red-400 dark:bg-red-400/10';
        }
    };

    const absValue = Math.abs(value);
    const formattedValue = absValue > 0 && absValue < 1 ? absValue.toFixed(2) : Math.round(absValue);

    return (
        <div className={clsx(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight",
            getColors(),
            className
        )}>
            {showIcon && (
                <>
                    {isNeutral && <Minus size={10} weight="bold" />}
                    {isIncreasing ? <TrendUp size={10} weight="bold" /> : !isNeutral && <TrendDown size={10} weight="bold" />}
                </>
            )}
            <span>{formattedValue}%</span>
        </div>
    );
};
