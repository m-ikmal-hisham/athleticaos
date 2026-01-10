import * as React from "react"
import { clsx } from "clsx"

const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

interface TabsProps {
    defaultValue: string;
    children: React.ReactNode;
    className?: string;
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
    const [value, setValue] = React.useState(defaultValue);

    return (
        <TabsContext.Provider value={{ value, onValueChange: setValue }}>
            <div className={clsx("w-full", className)}>{children}</div>
        </TabsContext.Provider>
    );
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
    return (
        <div className={clsx("inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}>
            {children}
        </div>
    );
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");

    const isActive = context.value === value;

    return (
        <button
            className={clsx(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-background text-foreground shadow-sm bg-white dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800/50",
                className
            )}
            onClick={() => context.onValueChange(value)}
        >
            {children}
        </button>
    );
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
    const context = React.useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");

    if (context.value !== value) return null;

    return (
        <div className={clsx("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    );
}
