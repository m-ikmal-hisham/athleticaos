import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Icon } from '@phosphor-icons/react';
import { clsx } from 'clsx';

export interface GlassTabBarItem {
    key: string;
    label: string;
    to?: string;
    icon?: Icon;
    renderIcon?: (active: boolean) => ReactNode;
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
    'relative z-10 flex flex-col items-center justify-center gap-0.5 min-h-[44px] h-full px-0 text-xs font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint active:scale-[0.96] motion-safe:transition-transform motion-safe:duration-150 select-none';

const activeCls = 'text-navy dark:text-navy-tint';
const inactiveCls = 'text-black/80 dark:text-white/85 hover:text-navy dark:hover:text-navy-tint';

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
    ariaLabel,
    className,
}: GlassTabBarProps) {
    const { t } = useTranslation();
    const resolvedAriaLabel = ariaLabel ?? t('nav.primaryNav');
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
    const activeItem = items.find((item) => item.key === activeKey) || items[0];

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
                    'relative w-full max-w-[480px] pointer-events-none',
                    hasAccessory ? 'h-[124px]' : 'h-[64px]'
                )}
            >
                {/* Accessory Slot (z-index pill 35) */}
                {hasAccessory && accessorySlot && (
                    <div
                        className={clsx(
                            'absolute z-[35] bottom-[72px] left-0 w-[calc(100%-60px)] h-[52px] pointer-events-auto',
                            'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-reduce:transition-none',
                            'motion-safe:animate-fade-in'
                        )}
                        style={{
                            // Same width in both states (bar minus the 60px minimised button), so only
                            // transform moves it: centred above the bar, or beside the minimised button.
                            transform: isMinimised ? 'translate3d(60px, 72px, 0)' : 'translate3d(30px, 0, 0)',
                            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                        }}
                    >
                        {accessorySlot}
                    </div>
                )}

                {/* Expanded Tab Bar Capsule (z-index nav 30) */}
                <nav
                    aria-label={resolvedAriaLabel}
                    aria-hidden={isMinimised ? true : undefined}
                    {...(isMinimised ? { inert: '' } : {})}
                    className={clsx(
                        'glass bg-white/88 dark:bg-deep-navy/90 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
                        'absolute z-30 bottom-0 left-0 w-full h-[64px] rounded-full overflow-hidden pointer-events-auto',
                        'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-reduce:transition-none',
                        isMinimised
                            ? 'opacity-0 scale-95 pointer-events-none'
                            : 'opacity-100 scale-100 pointer-events-auto'
                    )}
                    style={{
                        transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                    }}
                >
                    {/* Selection Lozenge */}
                    <div
                        aria-hidden="true"
                        className={clsx(
                            'absolute rounded-full pointer-events-none bg-navy/12 dark:bg-white/16',
                            'motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none',
                            activeIndex >= 0 ? 'opacity-100' : 'opacity-0'
                        )}
                        style={{
                            transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                            top: '6px',
                            bottom: '6px',
                            width: `calc(${100 / numItems}% - 8px)`,
                            left: `calc(${activeIndex * (100 / numItems)}% + 4px)`,
                        }}
                    />

                    {/* Nav Items List */}
                    <ul className="flex items-stretch h-full w-full m-0 p-0 list-none">
                        {items.map((item) => {
                            const isActive = item.key === activeKey;

                            const itemContent = (
                                <>
                                    {item.renderIcon ? (
                                        item.renderIcon(isActive)
                                    ) : item.icon ? (
                                        <item.icon
                                            size={24}
                                            weight={isActive ? 'fill' : 'duotone'}
                                            aria-hidden="true"
                                        />
                                    ) : null}
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
                                            tabIndex={isMinimised ? -1 : 0}
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
                                            tabIndex={isMinimised ? -1 : 0}
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

                {/* Minimised Tab Bar Active Icon Capsule (z-index nav 30) */}
                <div
                    aria-hidden={!isMinimised ? true : undefined}
                    {...(!isMinimised ? { inert: '' } : {})}
                    className={clsx(
                        'glass bg-white/88 dark:bg-deep-navy/90 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
                        'absolute z-30 bottom-0 left-0 w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center pointer-events-auto',
                        'motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-reduce:transition-none',
                        isMinimised
                            ? 'opacity-100 scale-100 pointer-events-auto cursor-pointer'
                            : 'opacity-0 scale-75 pointer-events-none'
                    )}
                    style={{
                        transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                    }}
                    onClick={isMinimised ? handleMinimisedTap : undefined}
                >
                    <div
                        aria-hidden="true"
                        className="absolute inset-1 rounded-full pointer-events-none bg-navy/10 dark:bg-white/12"
                    />
                    {activeItem && (
                        <button
                            type="button"
                            onClick={handleMinimisedTap}
                            tabIndex={isMinimised ? 0 : -1}
                            aria-label={t('nav.expandTabBar', { label: activeItem.label })}
                            className={clsx(
                                itemBase,
                                'w-full h-full p-0 flex items-center justify-center',
                                activeCls
                            )}
                        >
                            {activeItem.renderIcon ? (
                                activeItem.renderIcon(true)
                            ) : activeItem.icon ? (
                                <activeItem.icon
                                    size={24}
                                    weight="fill"
                                    aria-hidden="true"
                                />
                            ) : null}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

