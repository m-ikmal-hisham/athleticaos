import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Icon } from '@phosphor-icons/react';
import { clsx } from 'clsx';

export interface GlassTabBarItem {
    key: string;
    label: string;
    to?: string;
    icon: Icon;
    onClick?: () => void;
    ariaCurrent?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean;
    ariaHasPopup?: 'dialog' | 'menu' | boolean;
    ariaExpanded?: boolean;
}

export interface GlassTabBarProps {
    items: GlassTabBarItem[];
    activeKey: string | null;
    accessorySlot?: ReactNode;
    hasAccessory?: boolean;
    ariaLabel?: string;
    className?: string;
}

const itemBase =
    'relative z-10 flex flex-col items-center justify-center gap-0.5 min-h-[44px] h-full px-0 text-xs font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint active:scale-[0.96] motion-safe:transition-transform motion-safe:duration-150 select-none';

const activeCls = 'text-navy dark:text-navy-tint';
const inactiveCls = 'text-black/72 dark:text-white/72 hover:text-navy dark:hover:text-navy-tint';

/**
 * Generic floating glass tab bar.
 * Reusable for admin or public shells (STYLE_GUIDE principle 4).
 * Morphing capsule with scroll minimise when accessory is present.
 */
export function GlassTabBar({
    items,
    activeKey,
    accessorySlot,
    hasAccessory = false,
    ariaLabel = 'Primary',
    className,
}: GlassTabBarProps) {
    const [isMinimised, setIsMinimised] = useState(false);
    const lastScrollY = useRef(0);
    const scrollAnchorY = useRef(0);
    const direction = useRef<'up' | 'down'>('up');

    // Scroll listener for minimise / expand
    useEffect(() => {
        if (!hasAccessory) {
            setIsMinimised(false);
            return;
        }

        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentY = Math.max(0, window.scrollY);

                    // Near top of page: always expanded
                    if (currentY <= 24) {
                        setIsMinimised(false);
                        scrollAnchorY.current = currentY;
                        lastScrollY.current = currentY;
                        ticking = false;
                        return;
                    }

                    // Near bottom of page: always expanded (footer visibility)
                    const maxScroll = Math.max(
                        0,
                        document.documentElement.scrollHeight - window.innerHeight
                    );
                    if (currentY >= maxScroll - 24) {
                        setIsMinimised(false);
                        scrollAnchorY.current = currentY;
                        lastScrollY.current = currentY;
                        ticking = false;
                        return;
                    }

                    // Track direction and delta
                    if (currentY > lastScrollY.current) {
                        if (direction.current !== 'down') {
                            direction.current = 'down';
                            scrollAnchorY.current = currentY;
                        } else if (currentY - scrollAnchorY.current > 24) {
                            setIsMinimised(true);
                        }
                    } else if (currentY < lastScrollY.current) {
                        if (direction.current !== 'up') {
                            direction.current = 'up';
                            scrollAnchorY.current = currentY;
                        } else if (scrollAnchorY.current - currentY > 24) {
                            setIsMinimised(false);
                        }
                    }

                    lastScrollY.current = currentY;
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [hasAccessory]);

    // Active item index for selection lozenge
    const activeIndex = items.findIndex((item) => item.key === activeKey);
    const numItems = items.length;

    // Handle tapping active button while minimised
    const handleMinimisedTap = (e: React.MouseEvent) => {
        if (isMinimised) {
            e.preventDefault();
            e.stopPropagation();
            setIsMinimised(false);
        }
    };

    return (
        <div
            className={clsx(
                'print:hidden lg:hidden fixed z-30 inset-x-0 bottom-0 pointer-events-none flex flex-col items-center justify-end px-3',
                'pb-[max(12px,env(safe-area-inset-bottom,0px))]',
                className
            )}
            onFocusCapture={() => {
                // Expanding immediately on keyboard focus avoids trapped focus
                if (isMinimised) setIsMinimised(false);
            }}
        >
            <div
                className={clsx(
                    'relative w-full max-w-[480px] pointer-events-auto',
                    'motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none',
                    hasAccessory
                        ? isMinimised
                            ? 'h-[52px]'
                            : 'h-[124px]'
                        : 'h-[64px]'
                )}
                style={{
                    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                }}
            >
                {/* Accessory Slot (z-index pill 35) */}
                {hasAccessory && accessorySlot && (
                    <div
                        className={clsx(
                            'absolute z-[35]',
                            'motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none',
                            isMinimised
                                ? 'bottom-0 left-[60px] w-[calc(100%-60px)] h-[52px]'
                                : 'bottom-[72px] left-0 w-full h-[52px]'
                        )}
                        style={{
                            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                        }}
                    >
                        {accessorySlot}
                    </div>
                )}

                {/* Tab Bar Capsule (z-index nav 30) */}
                <nav
                    aria-label={ariaLabel}
                    className={clsx(
                        'glass absolute z-30 bottom-0 left-0 overflow-hidden',
                        'motion-safe:transition-all motion-safe:duration-300 motion-reduce:transition-none',
                        isMinimised
                            ? 'w-[52px] h-[52px] rounded-full cursor-pointer'
                            : 'w-full h-[64px] rounded-full'
                    )}
                    style={{
                        transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                    }}
                    onClick={isMinimised ? handleMinimisedTap : undefined}
                >
                    {/* Selection Lozenge */}
                    <div
                        aria-hidden="true"
                        className={clsx(
                            'absolute rounded-full pointer-events-none bg-navy/10 dark:bg-white/12',
                            'motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none',
                            activeIndex >= 0 ? 'opacity-100' : 'opacity-0'
                        )}
                        style={{
                            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                            ...(isMinimised
                                ? {
                                      inset: '4px',
                                  }
                                : {
                                      top: '6px',
                                      bottom: '6px',
                                      width: `calc(${100 / numItems}% - 8px)`,
                                      left: `calc(${activeIndex * (100 / numItems)}% + 4px)`,
                                  }),
                        }}
                    />

                    {/* Nav Items List */}
                    <ul className="flex items-stretch h-full w-full m-0 p-0 list-none">
                        {items.map((item) => {
                            const isActive = item.key === activeKey;
                            const Icon = item.icon;

                            // When minimised, only the active item is shown
                            if (isMinimised) {
                                if (!isActive) return null;
                                return (
                                    <li key={item.key} className="flex-1 h-full w-full">
                                        <button
                                            type="button"
                                            onClick={handleMinimisedTap}
                                            aria-label={`${item.label} (Expand tab bar)`}
                                            className={clsx(
                                                itemBase,
                                                'w-full h-full p-0 flex items-center justify-center',
                                                activeCls
                                            )}
                                        >
                                            <Icon
                                                size={24}
                                                weight="fill"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </li>
                                );
                            }

                            // Expanded state: show all items
                            const itemContent = (
                                <>
                                    <Icon
                                        size={24}
                                        weight={isActive ? 'fill' : 'duotone'}
                                        aria-hidden="true"
                                    />
                                    <span className="truncate max-w-full leading-tight px-0.5">
                                        {item.label}
                                    </span>
                                </>
                            );

                            return (
                                <li
                                    key={item.key}
                                    className="flex flex-1 min-w-0 h-full"
                                    style={{ width: `${100 / numItems}%` }}
                                >
                                    {item.to ? (
                                        <Link
                                            to={item.to}
                                            aria-current={isActive ? 'page' : undefined}
                                            onClick={item.onClick}
                                            className={clsx(
                                                itemBase,
                                                'w-full',
                                                isActive ? activeCls : inactiveCls
                                            )}
                                        >
                                            {itemContent}
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={item.onClick}
                                            aria-haspopup={item.ariaHasPopup}
                                            aria-expanded={item.ariaExpanded}
                                            className={clsx(
                                                itemBase,
                                                'w-full',
                                                isActive ? activeCls : inactiveCls
                                            )}
                                        >
                                            {itemContent}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </div>
    );
}
