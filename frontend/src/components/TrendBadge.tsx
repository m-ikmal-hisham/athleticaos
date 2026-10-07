import React from 'react';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { clsx } from 'clsx';

interface TrendBadgeProps {
    value: number;
    className?: string;
    showIcon?: boolean;
    inverse?: boolean; // If true, decreasing is good, increasing is bad
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ 
    value, 
    className, 
    showIcon = true,
    inverse = false 
}) => {
    const isNeutral = value === 0;
    const isIncreasing = value > 0;
    const isPositive = (isIncreasing && !inverse) || (!isIncreasing && !isNeutral && inverse);
    
    // Positive = navy, negative = crimson, neutral = secondary/sunken
    const getColors = () => {
        if (isNeutral) {
            return 'text-black/60 dark:text-white/60 bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12';
        }
        
        if (isPositive) {
            return 'text-navy dark:text-navy-tint bg-navy/8 dark:bg-navy-tint/12 border border-navy/20 dark:border-navy-tint/30';
        } else {
            return 'text-crimson dark:text-crimson-tint bg-crimson/8 dark:bg-crimson-tint/12 border border-crimson/20 dark:border-crimson-tint/30';
        }
    };

    const absValue = Math.abs(value);
    const formattedValue = absValue > 0 && absValue < 1 ? absValue.toFixed(2) : Math.round(absValue);

    return (
        <div className={clsx(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold tracking-tight",
            getColors(),
            className
        )}>
            {showIcon && (
                <>
                    {isNeutral && <Minus className="w-3 h-3" />}
                    {isIncreasing ? <TrendUp className="w-3 h-3" /> : !isNeutral && <TrendDown className="w-3 h-3" />}
                </>
            )}
            <span>{formattedValue}%</span>
        </div>
    );
};
