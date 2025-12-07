import React from 'react';
import { clsx } from 'clsx';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
    children: React.ReactNode;
}

export const Label = ({ className, children, ...props }: LabelProps) => {
    return (
        <label
            className={clsx(
                "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground",
                className
            )}
            {...props}
        >
            {children}
        </label>
    );
};
