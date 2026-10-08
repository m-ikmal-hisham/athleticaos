import React, { useState, useRef, useEffect, useMemo, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { clsx } from 'clsx';

export interface SelectOption {
    value: string | number;
    label: string;
    disabled?: boolean;
}

export type Option = SelectOption;

export interface SelectProps {
    options: (SelectOption | string | number)[];
    value?: string | number | null;
    onChange?: (value: string | number) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    triggerClassName?: string;
    name?: string;
    id?: string;
    error?: string;
    disabled?: boolean;
    disabledReason?: string;
    required?: boolean;
    searchable?: boolean;
    creatable?: boolean;
    onCreate?: (query: string) => void;
    'aria-label'?: string;
}

export const Select = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    label,
    className,
    triggerClassName,
    name,
    id,
    error,
    disabled = false,
    disabledReason,
    required = false,
    searchable,
    creatable = false,
    onCreate,
    'aria-label': ariaLabel,
}: SelectProps) => {
    const generatedId = useId();
    const selectId = id || name || `select-${generatedId}`;
    const labelId = `${selectId}-label`;
    const listboxId = `${selectId}-listbox`;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const [isMobile, setIsMobile] = useState(false);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [menuPosition, setMenuPosition] = useState<{
        top?: number;
        bottom?: number;
        left: number;
        width: number;
        openUp: boolean;
    }>({ left: 0, width: 0, openUp: false });

    // Normalize options to SelectOption[]
    const normalizedOptions: SelectOption[] = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: opt, label: String(opt) };
            }
            return opt;
        });
    }, [options]);

    const isSearchable = searchable !== undefined ? searchable : normalizedOptions.length > 7;

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return normalizedOptions;
        const q = searchQuery.toLowerCase();
        return normalizedOptions.filter(opt =>
            opt.label.toLowerCase().includes(q)
        );
    }, [normalizedOptions, searchQuery]);

    const selectedOption = useMemo(() => {
        if (value === undefined || value === null) {
            return normalizedOptions.find(opt => opt.value === '');
        }
        return normalizedOptions.find(opt => opt.value === value || String(opt.value) === String(value));
    }, [normalizedOptions, value]);

    const displayLabel = selectedOption
        ? selectedOption.label
        : (value !== undefined && value !== null && value !== ''
            ? String(value)
            : placeholder);

    const isPlaceholder = !selectedOption && (value === undefined || value === null || value === '');

    // Check for phone breakpoint (<640px)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calculate desktop position
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const panelMaxHeight = 288; // 18rem (max-h-72)
        const openUp = spaceBelow < panelMaxHeight && spaceAbove > spaceBelow;

        setMenuPosition({
            top: openUp ? undefined : rect.bottom + 4,
            bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
            left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
            width: rect.width,
            openUp,
        });
    }, []);

    useEffect(() => {
        if (isOpen && !isMobile) {
            updatePosition();
        }
    }, [isOpen, isMobile, updatePosition]);

    // Lock page scrolling while the mobile bottom sheet is open
    useEffect(() => {
        if (!isOpen || !isMobile) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, isMobile]);

    // Handle outside click & scroll close (desktop only)
    useEffect(() => {
        if (!isOpen || isMobile) return;

        const handleScroll = (event: Event) => {
            if (panelRef.current && panelRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (triggerRef.current && triggerRef.current.contains(event.target as Node)) {
                return;
            }
            if (panelRef.current && panelRef.current.contains(event.target as Node)) {
                return;
            }
            setIsOpen(false);
        };

        window.addEventListener('scroll', handleScroll, true);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, isMobile]);

    // Auto-focus search input when opened
    useEffect(() => {
        if (isOpen && isSearchable) {
            // Small timeout to allow portal rendering
            const timer = setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isSearchable]);

    // Highlight selected or first option when opened
    useEffect(() => {
        if (isOpen) {
            const selectedIdx = filteredOptions.findIndex(opt => opt.value === value || String(opt.value) === String(value));
            setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
        } else {
            setFocusedIndex(-1);
            setSearchQuery('');
        }
    }, [isOpen, filteredOptions, value]);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && focusedIndex >= 0) {
            const el = document.getElementById(`${selectId}-opt-${focusedIndex}`);
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [focusedIndex, isOpen, selectId]);

    const handleSelect = (option: SelectOption) => {
        if (option.disabled) return;
        onChange?.(option.value);
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
    };

    const handleCreate = () => {
        if (onCreate) {
            onCreate(searchQuery);
        } else {
            onChange?.(searchQuery);
        }
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
                return;
            }
            if (!isSearchable && e.key.length === 1 && /^[a-z0-9]$/i.test(e.key)) {
                const letter = e.key.toLowerCase();
                const match = normalizedOptions.find(opt => opt.label.trim().toLowerCase().startsWith(letter));
                if (match) {
                    onChange?.(match.value);
                }
            }
            return;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            triggerRef.current?.focus();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                setFocusedIndex(prev => (prev + 1) % filteredOptions.length);
            }
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredOptions.length > 0) {
                setFocusedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
            }
            return;
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
                handleSelect(filteredOptions[focusedIndex]);
            }
            return;
        }

        if (!isSearchable && e.key.length === 1 && /^[a-z0-9]$/i.test(e.key)) {
            const letter = e.key.toLowerCase();
            const startIdx = focusedIndex + 1;
            const remaining = filteredOptions.slice(startIdx);
            const nextMatchInRemaining = remaining.findIndex(opt => opt.label.trim().toLowerCase().startsWith(letter));
            if (nextMatchInRemaining !== -1) {
                setFocusedIndex(startIdx + nextMatchInRemaining);
            } else {
                const wrapMatch = filteredOptions.findIndex(opt => opt.label.trim().toLowerCase().startsWith(letter));
                if (wrapMatch !== -1) {
                    setFocusedIndex(wrapMatch);
                }
            }
        }
    };

    const renderOptionsList = () => (
        <ul
            role="listbox"
            id={listboxId}
            aria-labelledby={label ? labelId : undefined}
            aria-label={ariaLabel}
            className="p-1 space-y-0.5"
        >
            {filteredOptions.length > 0 ? (
                filteredOptions.map((option, idx) => {
                    const isSelected = selectedOption?.value === option.value;
                    const isFocused = idx === focusedIndex;

                    return (
                        <li
                            key={`${option.value}-${idx}`}
                            id={`${selectId}-opt-${idx}`}
                            role="option"
                            aria-selected={isSelected}
                            aria-disabled={option.disabled}
                            onClick={() => handleSelect(option)}
                            onMouseEnter={() => setFocusedIndex(idx)}
                            className={clsx(
                                "w-full text-left px-3 py-2.5 rounded-[8px] text-base sm:text-sm transition-colors flex items-center justify-between gap-2 cursor-pointer",
                                option.disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                                isSelected
                                    ? "text-navy dark:text-navy-tint font-medium"
                                    : "text-black/90 dark:text-white/92",
                                isFocused && "bg-black/4 dark:bg-white/6"
                            )}
                        >
                            <span className="flex-1 whitespace-normal break-words leading-snug">
                                {option.label}
                            </span>
                            {isSelected && (
                                <Check className="w-4 h-4 text-navy dark:text-navy-tint shrink-0" weight="bold" />
                            )}
                        </li>
                    );
                })
            ) : (
                !searchQuery && creatable ? (
                    <li className="py-6 text-center text-black/60 dark:text-white/60 text-sm">
                        Type to create...
                    </li>
                ) : !searchQuery && !creatable ? (
                    <li className="py-6 text-center text-black/60 dark:text-white/60 text-sm">
                        No options
                    </li>
                ) : null
            )}

            {searchQuery && filteredOptions.length === 0 && !creatable && (
                <li className="py-6 text-center text-black/60 dark:text-white/60 text-sm">
                    No results found
                </li>
            )}

            {creatable && searchQuery && !normalizedOptions.some(o => o.label.toLowerCase() === searchQuery.toLowerCase()) && (
                <li className={clsx("pt-1", filteredOptions.length > 0 && "border-t border-black/10 dark:border-white/12 mt-1")}>
                    <button
                        type="button"
                        onClick={handleCreate}
                        className="w-full text-left px-3 py-2.5 rounded-[8px] text-sm text-navy dark:text-navy-tint hover:bg-black/4 dark:hover:bg-white/6 font-medium transition-colors flex items-center gap-2"
                    >
                        <span className="break-words">Create "{searchQuery}"</span>
                    </button>
                </li>
            )}
        </ul>
    );

    return (
        <div className={clsx("relative w-full", className)}>
            {label && (
                <label
                    id={labelId}
                    htmlFor={selectId}
                    className="block text-sm font-medium text-black/72 dark:text-white/72 mb-1.5"
                >
                    {label}
                    {required && <span className="text-crimson dark:text-crimson-tint ml-1">*</span>}
                </label>
            )}

            <button
                ref={triggerRef}
                type="button"
                id={selectId}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-activedescendant={isOpen && focusedIndex >= 0 ? `${selectId}-opt-${focusedIndex}` : undefined}
                aria-label={ariaLabel || label}
                disabled={disabled}
                title={disabled && disabledReason ? disabledReason : undefined}
                onClick={() => {
                    if (!disabled) {
                        setIsOpen(!isOpen);
                    }
                }}
                onKeyDown={handleKeyDown}
                className={clsx(
                    "w-full rounded-[10px] min-h-[44px] px-3 py-2 text-base sm:text-sm font-normal text-left transition-colors flex items-center justify-between gap-2 outline-none",
                    // Input-like styling
                    "bg-black/4 dark:bg-white/6 border border-black/24 dark:border-white/28",
                    // Focus and open rings
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint focus-visible:ring-offset-2",
                    isOpen && "ring-2 ring-navy dark:ring-navy-tint border-navy dark:border-navy-tint",
                    // Error state
                    error && "border-crimson dark:border-crimson-tint focus-visible:ring-crimson dark:focus-visible:ring-crimson-tint",
                    // Disabled state
                    disabled && "bg-black/6 dark:bg-white/8 text-black/40 dark:text-white/40 border-transparent shadow-none cursor-not-allowed pointer-events-none",
                    triggerClassName
                )}
            >
                <span className={clsx(
                    "flex-1 whitespace-normal break-words leading-snug",
                    isPlaceholder ? "text-black/60 dark:text-white/60" : "text-black/90 dark:text-white/92"
                )}>
                    {displayLabel}
                </span>
                <CaretDown
                    className={clsx(
                        "w-4 h-4 text-black/60 dark:text-white/60 shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {name && (
                <input type="hidden" name={name} value={value ?? ''} />
            )}

            {error && (
                <p className="mt-1.5 text-xs text-crimson dark:text-crimson-tint">{error}</p>
            )}

            {/* Dropdown Panel Portal */}
            {isOpen && createPortal(
                isMobile ? (
                    /* Mobile Bottom Sheet (< 640px) */
                    <div className="fixed inset-0 z-50 flex flex-col justify-end">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Sheet */}
                        <div
                            ref={panelRef}
                            onKeyDown={handleKeyDown}
                            className="relative z-50 w-full bg-white dark:bg-deep-navy rounded-t-[20px] border-t border-black/10 dark:border-white/12 shadow-lg max-h-[80dvh] flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+16px)] animate-slide-up"
                        >
                            {/* Grab handle */}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto my-2.5 shrink-0 cursor-pointer hover:bg-black/40 dark:hover:bg-white/40 transition-colors"
                                aria-label="Close"
                            />

                            {label && (
                                <div className="px-4 pb-2 text-sm font-semibold text-black/90 dark:text-white/92 border-b border-black/10 dark:border-white/12">
                                    {label}
                                </div>
                            )}

                            {isSearchable && (
                                <div className="p-3 border-b border-black/10 dark:border-white/12">
                                    <div className="relative">
                                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Search..."
                                            className="w-full bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 rounded-[8px] py-2 pl-9 pr-3 text-sm text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-navy dark:focus:ring-navy-tint"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto max-h-[60dvh] p-2">
                                {renderOptionsList()}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Desktop / Tablet Dropdown Panel (>= 640px) */
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: menuPosition.top,
                            bottom: menuPosition.bottom,
                            left: menuPosition.left,
                            width: menuPosition.width,
                            zIndex: 50,
                        }}
                        className="bg-white dark:bg-deep-navy border border-black/10 dark:border-white/12 rounded-[10px] shadow-md max-h-72 flex flex-col overflow-hidden animate-fade-in"
                    >
                        {isSearchable && (
                            <div className="p-2 border-b border-black/10 dark:border-white/12">
                                <div className="relative">
                                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60 dark:text-white/60" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Search..."
                                        className="w-full bg-black/4 dark:bg-white/6 border border-black/10 dark:border-white/12 rounded-[8px] py-2 pl-9 pr-3 text-sm text-black/90 dark:text-white/92 placeholder:text-black/60 dark:placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-navy dark:focus:ring-navy-tint"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-1 max-h-60">
                            {renderOptionsList()}
                        </div>
                    </div>
                ),
                document.body
            )}
        </div>
    );
};

export const SearchableSelect = Select;
export default Select;
