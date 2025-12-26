
import { HTMLAttributes, forwardRef } from 'react';

import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    variant?: 'default' | 'subtle' | 'high-contrast';
}

/**
 * Strict Glassmorphism Card Component
 * Enforces:
 * - Backdrop blur (16px)
 * - Backdrop saturate (180%)
 * - Semi-transparent background
 * - Soft border
 * - Apple-style shadow
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hover = false, variant = 'default', children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={twMerge(
                    // Base Glass Styles - using locked variables
                    'relative overflow-hidden rounded-[18px] border transition-all duration-300',
                    'backdrop-blur-[var(--glass-blur)] backdrop-saturate-[180%]',
                    'shadow-[var(--glass-shadow-md)]',

                    // Variants - using theme variables
                    variant === 'default' && [
                        'bg-[var(--glass-bg)]',
                        'border-white/20 dark:border-white/10'
                    ],
                    variant === 'subtle' && [
                        'bg-white/50 dark:bg-slate-900/50',
                        'border-white/10 dark:border-white/5'
                    ],
                    variant === 'high-contrast' && [
                        'bg-white/75 dark:bg-slate-900/75',
                        'border-white/30 dark:border-white/20'
                    ],

                    // Simplified hover effects
                    hover && 'hover:shadow-[var(--glass-shadow-lg)] hover:-translate-y-[1px] hover:border-[var(--highlight-color)]',

                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

GlassCard.displayName = 'GlassCard';

export const GlassCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge('flex flex-col space-y-2 p-8', className)} {...props} />
    )
);

GlassCardHeader.displayName = 'GlassCardHeader';

export const GlassCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={twMerge('text-lg font-semibold leading-none tracking-tight text-foreground', className)} {...props} />
    )
);

GlassCardTitle.displayName = 'GlassCardTitle';

export const GlassCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={twMerge('text-sm text-muted-foreground', className)} {...props} />
    )
);

GlassCardDescription.displayName = 'GlassCardDescription';

export const GlassCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge('p-8 pt-0', className)} {...props} />
    )
);

GlassCardContent.displayName = 'GlassCardContent';

export const GlassCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge('flex items-center p-8 pt-0', className)} {...props} />
    )
);

GlassCardFooter.displayName = 'GlassCardFooter';
