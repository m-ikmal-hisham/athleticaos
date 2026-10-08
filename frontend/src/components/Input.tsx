import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-sm font-medium text-black/72 dark:text-white/72 mb-1.5">
                        {label}
                        {props.required && <span className="text-crimson dark:text-crimson-tint ml-1">*</span>}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={clsx(
                        'input-base',
                        error
                            ? 'border-crimson dark:border-crimson-tint focus:border-crimson focus:ring-crimson/20'
                            : '',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-xs text-crimson dark:text-crimson-tint">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-xs text-black/60 dark:text-white/60">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
