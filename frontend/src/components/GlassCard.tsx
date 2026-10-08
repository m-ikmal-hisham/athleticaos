import { HTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
    variant?: 'default' | 'subtle' | 'high-contrast';
}

/**
 * Card Component (formerly GlassCard, now solid per STYLE_GUIDE)
 * Uses surface-card, line-subtle border, radius-lg (14px). No backdrop blur.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    ({ className, hover = false, variant: _variant = 'default', children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={twMerge(
                    'bg-surface-card border border-line-subtle rounded-[14px] text-content-primary transition-colors',
                    hover && 'hover:bg-black/4 dark:hover:bg-white/6 cursor-pointer',
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
