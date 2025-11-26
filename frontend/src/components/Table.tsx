import { TableHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => (
        <div className="w-full overflow-auto custom-scrollbar rounded-lg border border-glass-border">
            <table
                ref={ref}
                className={clsx('w-full caption-bottom text-sm', className)}
                {...props}
            />
        </div>
    )
);

Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <thead ref={ref} className={clsx('bg-glass-bg backdrop-blur-sm', className)} {...props} />
    )
);

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, TableHTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => (
        <tbody ref={ref} className={clsx('[&_tr:last-child]:border-0', className)} {...props} />
    )
);

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, TableHTMLAttributes<HTMLTableRowElement>>(
    ({ className, ...props }, ref) => (
        <tr
            ref={ref}
            className={clsx(
                'border-b border-glass-border transition-colors hover:bg-black/5 dark:hover:bg-white/5',
                className
            )}
            {...props}
        />
    )
);

TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, TableHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <th
            ref={ref}
            className={clsx(
                'h-12 px-4 text-left align-middle font-semibold text-muted',
                className
            )}
            {...props}
        />
    )
);

TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TableHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <td
            ref={ref}
            className={clsx('p-4 align-middle text-foreground', className)}
            {...props}
        />
    )
);

TableCell.displayName = 'TableCell';
