import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'live';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
            // Live = crimson fill + white text
            live: 'bg-crimson text-white border-crimson',
            // Success / completed / primary / default / info = navy text on navy 8% tint
            default: 'bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint border-navy/20 dark:border-navy-tint/30',
            success: 'bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint border-navy/20 dark:border-navy-tint/30',
            info: 'bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint border-navy/20 dark:border-navy-tint/30',
            primary: 'bg-navy/8 dark:bg-navy-tint/12 text-navy dark:text-navy-tint border-navy/20 dark:border-navy-tint/30',
            // Warning / pending = black/white text on sunken surface
            warning: 'bg-black/4 dark:bg-white/6 text-black/90 dark:text-white/92 border-black/10 dark:border-white/12',
            // Danger / destructive = crimson text
            danger: 'bg-crimson/8 dark:bg-crimson-tint/12 text-crimson dark:text-crimson-tint border-crimson/20 dark:border-crimson-tint/30',
            destructive: 'bg-crimson/8 dark:bg-crimson-tint/12 text-crimson dark:text-crimson-tint border-crimson/20 dark:border-crimson-tint/30',
            // Secondary / outline = subtle border with secondary content
            secondary: 'bg-transparent border-black/24 dark:border-white/28 text-black/72 dark:text-white/72',
            outline: 'bg-transparent border-black/24 dark:border-white/28 text-black/72 dark:text-white/72',
        };

        return (
            <span
                ref={ref}
                className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

Badge.displayName = 'Badge';
