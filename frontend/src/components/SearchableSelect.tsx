import { useState, useRef, useEffect, useMemo } from 'react';
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { clsx } from 'clsx';
// Looking at package.json, we don't have headlessui. I'll use simple conditional rendering and CSS animations if needed.

interface Option {
    value: string | number;
    label: string;
}

interface SearchableSelectProps {
    options: Option[] | string[];
    value?: string | number;
    onChange: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    name?: string;
    id?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    creatable?: boolean;
    onCreate?: (query: string) => void;
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    label,
    className,
    error,
    disabled = false,
    required = false,
    creatable = false,
    onCreate,
    name,
    id
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Normalize options to Option[]
    const normalizedOptions: Option[] = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'string') {
                return { value: opt, label: opt };
            }
            return opt as Option;
        });
    }, [options]);

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return normalizedOptions;
        return normalizedOptions.filter(opt =>
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [normalizedOptions, searchQuery]);

    // Handle display label logic better: if value is not in options but searchable (creatable), show value?
    // Or we rely on parent to handle state if creatable.
    // If selectedOption is undefined but we have a value and it's creatable/custom mode?
    // Actually simplicity: If selectedOption found, show label. If not, show value if it's a string (custom input).
    const displayLabel = selectedOption ? selectedOption.label : (typeof value === 'string' && value ? value : placeholder);
    const isPlaceholder = !selectedOption && (!value || typeof value !== 'string');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery(''); // Reset search on close
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (option: Option) => {
        onChange(option.value);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleCreate = () => {
        if (onCreate) {
            onCreate(searchQuery);
        } else {
            // Default behavior if no onCreate: pass query as value
            onChange(searchQuery);
        }
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div ref={containerRef} className={clsx("relative w-full", className)}>
            {label && (
                <label
                    htmlFor={id || name}
                    className="block text-sm font-medium text-muted mb-1.5"
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div
                className={clsx(
                    "relative w-full rounded-xl border bg-background text-foreground transition-all duration-200 py-2.5 px-3 min-h-[44px] cursor-pointer outline-none flex items-center justify-between",
                    error
                        ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                        : "border-border hover:border-blue-500/50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20",
                    disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-white/5",
                    isOpen && "ring-2 ring-blue-500/20 border-blue-500"
                )}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex-1 truncate mr-2 text-sm">
                    <span className={clsx(isPlaceholder ? "text-muted/60" : "text-foreground font-medium")}>{displayLabel}</span>
                </div>
                <CaretDown
                    weight="bold"
                    className={clsx(
                        "w-4 h-4 text-muted transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
            )}

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl overflow-hidden animation-fade-in-up origin-top">
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-muted/50 text-foreground"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={clsx(
                                        "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between group",
                                        option.value === value
                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                            : "text-foreground hover:bg-slate-50 dark:hover:bg-white/5"
                                    )}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value && (
                                        <Check weight="bold" className="w-4 h-4 text-blue-500 animate-scale-in" />
                                    )}
                                </button>
                            ))
                        ) : (
                            // Empty state (no matches)
                            !searchQuery && creatable ? (
                                <div className="py-6 text-center text-muted text-sm">
                                    Type to create...
                                </div>
                            ) : !searchQuery && !creatable ? (
                                <div className="py-6 text-center text-muted text-sm">
                                    No results found
                                </div>
                            ) : null // If there is a query, we handle "No results" implicitly by checking if create button is main thing or just nothing.
                        )}

                        {/* Show "No results" if we have query but no options, AND we are NOT showing the create button (handled below) */}
                        {searchQuery && filteredOptions.length === 0 && !creatable && (
                            <div className="py-6 text-center text-muted text-sm">
                                No results found
                            </div>
                        )}

                        {/* Always show create option if creatable and query exists and not exact match */}
                        {creatable && searchQuery && !normalizedOptions.some(o => o.label.toLowerCase() === searchQuery.toLowerCase()) && (
                            <div className={clsx("pt-1", filteredOptions.length > 0 && "border-t border-border mt-1")}>
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium transition-colors flex items-center gap-2"
                                >
                                    <span className="truncate">Create "{searchQuery}"</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
