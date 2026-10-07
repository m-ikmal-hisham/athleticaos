import { ButtonHTMLAttributes, forwardRef, useId } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /**
     * Allowed variants per STYLE_GUIDE §6:
     * - primary: solid brand Navy
     * - secondary: surface + border
     * - ghost: transparent + hover
     * - danger: solid Crimson
     *
     * @deprecated 'outline' -> use 'secondary'
     * @deprecated 'cancel' -> use 'ghost' with crimson text or 'secondary'
     * @deprecated 'tertiary' -> use 'secondary'
     */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cancel' | 'tertiary';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    disabledReason?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, disabledReason, children, disabled, ...props }, ref) => {
        const generatedId = useId();
        const reasonId = props.id ? `${props.id}-disabled-reason` : `btn-reason-${generatedId}`;
        const hasDisabledReason = Boolean(disabled && disabledReason);

        return (
            <button
                ref={ref}
                className={clsx(
                    'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint focus-visible:ring-offset-2',
                    // Primary variant
                    !disabled && variant === 'primary' && 'bg-navy text-white hover:bg-deep-navy dark:hover:bg-[#1F5BB3]',
                    // Secondary and deprecated aliases (outline, tertiary, cancel)
                    !disabled && (variant === 'secondary' || variant === 'outline' || variant === 'tertiary' || variant === 'cancel') &&
                        'bg-white dark:bg-deep-navy border border-black/24 dark:border-white/28 text-black/90 dark:text-white/92 hover:bg-black/4 dark:hover:bg-white/6',
                    // Ghost variant
                    !disabled && variant === 'ghost' && 'bg-transparent text-black/90 dark:text-white/92 hover:bg-black/4 dark:hover:bg-white/6',
                    // Danger variant
                    !disabled && variant === 'danger' && 'bg-crimson text-white hover:bg-[#9E0F19]',
                    // Explicit disabled style for all variants per STYLE_GUIDE
                    disabled && 'bg-black/6 dark:bg-white/8 text-black/40 dark:text-white/40 border border-transparent shadow-none cursor-not-allowed',
                    // Loading style (when not disabled)
                    isLoading && !disabled && 'cursor-wait opacity-80',
                    // Sizes: sm 36px (h-9), md 44px (h-11), lg 48px (h-12)
                    size === 'sm' && 'h-9 px-3 text-xs',
                    size === 'md' && 'h-11 px-4 text-sm',
                    size === 'lg' && 'h-12 px-6 text-base',
                    className
                )}
                disabled={disabled || isLoading}
                title={hasDisabledReason ? disabledReason : props.title}
                aria-describedby={hasDisabledReason ? [props['aria-describedby'], reasonId].filter(Boolean).join(' ') : props['aria-describedby']}
                {...props}
            >
                {isLoading && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                )}
                {children}
                {hasDisabledReason && (
                    <span id={reasonId} className="sr-only">
                        {disabledReason}
                    </span>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
