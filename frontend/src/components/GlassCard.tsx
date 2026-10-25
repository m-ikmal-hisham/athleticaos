import { HTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    variant?: 'default' | 'subtle' | 'high-contrast';
    surface?: 'solid' | 'glass';
}

/**
 * Card Component
 * Solid by default (bg-surface-card border-line-subtle).
 * Public pages pass surface="glass" to activate .glass-card-surface styling.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hover = false, variant: _variant = 'default', surface = 'solid', children, ...props }, ref) => {
        const isGlass = surface === 'glass';
        return (
            <div
                ref={ref}
                data-no-kick
                className={twMerge(
                    isGlass
                        ? 'glass-card-surface text-content-primary'
                        : 'bg-surface-card border border-line-subtle rounded-[14px] text-content-primary transition-colors',
                    hover && (isGlass ? 'glass-card-interactive cursor-pointer' : 'hover:bg-black/4 dark:hover:bg-white/6 cursor-pointer'),
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
        <div ref={ref} className={twMerge('flex flex-col space-y-2 p-6', className)} {...props} />
    )
);

GlassCardHeader.displayName = 'GlassCardHeader';

export const GlassCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={twMerge('text-lg font-semibold leading-none tracking-tight text-content-primary', className)} {...props} />
    )
);

GlassCardTitle.displayName = 'GlassCardTitle';

export const GlassCardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={twMerge('text-sm text-black/72 dark:text-white/72', className)} {...props} />
    )
);

GlassCardDescription.displayName = 'GlassCardDescription';

export const GlassCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge('p-6 pt-0', className)} {...props} />
    )
);

GlassCardContent.displayName = 'GlassCardContent';

export const GlassCardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={twMerge('flex items-center p-6 pt-0', className)} {...props} />
    )
);

GlassCardFooter.displayName = 'GlassCardFooter';
