import { useRef, useState, useEffect, ReactNode } from 'react';
import { clsx } from 'clsx';

export interface TabItem {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string; weight?: 'fill' | 'regular' | 'bold' | 'duotone' }>;
    count?: number | null;
}

export interface ScrollableTabStripProps {
    tabs?: TabItem[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    children?: ReactNode;
    ariaLabel?: string;
    className?: string;
    navClassName?: string;
    variant?: 'pill' | 'stacked';
}

/**
 * Shared sticky, horizontally scrollable tab strip with edge fades,
 * active tab centered into view, and >= 44px hit targets.
 *
 * Uses `top-[var(--public-header-offset,4rem)]` with a 200ms transition to track
 * the hide-on-scroll public top bar (< lg); from lg the bar never hides, so the strip sits just below it.
 */
export function ScrollableTabStrip({
    tabs,
    activeTab,
    onTabChange,
    children,
    ariaLabel = 'Tabs',
    className,
    navClassName,
    variant = 'pill',
}: ScrollableTabStripProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeftFade, setShowLeftFade] = useState(false);
    const [showRightFade, setShowRightFade] = useState(false);

    // Track scroll position to toggle edge gradient fades
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const checkScroll = () => {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setShowLeftFade(scrollLeft > 4);
            setShowRightFade(scrollLeft < scrollWidth - clientWidth - 4);
        };

        checkScroll();
        el.addEventListener('scroll', checkScroll, { passive: true });
        window.addEventListener('resize', checkScroll);

        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [tabs, children]);

    // Keep active tab centered in view
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const activeEl = container.querySelector<HTMLElement>(
            '[aria-selected="true"], [aria-current="page"]'
        );
        if (activeEl) {
            container.scrollTo({
                left: activeEl.offsetLeft - (container.clientWidth - activeEl.clientWidth) / 2,
                behavior: 'smooth',
            });
        }
    }, [activeTab]);

    return (
        <div
            className={clsx(
                'sticky top-[var(--public-header-offset,4rem)] lg:top-[calc(4rem+2px)] z-30 motion-safe:transition-[top] motion-safe:duration-200',
                className
            )}
        >
            <div className="relative group max-w-full">
                {/* Left Fade */}
                <div
                    aria-hidden="true"
                    className={clsx(
                        'absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none transition-opacity duration-200',
                        showLeftFade ? 'opacity-100' : 'opacity-0'
                    )}
                />
                {/* Right Fade */}
                <div
                    aria-hidden="true"
                    className={clsx(
                        'absolute right-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none transition-opacity duration-200',
                        showRightFade ? 'opacity-100' : 'opacity-0'
                    )}
                />

                {/* Scrollable Container */}
                <nav
                    ref={scrollRef}
                    role="tablist"
                    aria-label={ariaLabel}
                    className={clsx(
                        'flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth py-1 px-1',
                        navClassName
                    )}
                >
                    {children
                        ? children
                        : tabs?.map((tab) => {
                              const isActive = activeTab === tab.id;
                              const Icon = tab.icon;

                              if (variant === 'stacked') {
                                  return (
                                      <button
                                          key={tab.id}
                                          type="button"
                                          role="tab"
                                          id={`tab-${tab.id}`}
                                          aria-selected={isActive}
                                          aria-controls={`panel-${tab.id}`}
                                          onClick={() => onTabChange?.(tab.id)}
                                          className={clsx(
                                              'flex-1 min-w-[4.5rem] min-h-[44px] flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-colors',
                                              isActive
                                                  ? 'bg-navy text-white shadow-xs'
                                                  : 'text-black/72 dark:text-white/72 hover:bg-black/4 dark:hover:bg-white/6',
                                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy'
                                          )}
                                      >
                                          <span className="relative">
                                              {Icon && (
                                                  <Icon
                                                      className="w-5 h-5"
                                                      weight={isActive ? 'fill' : 'duotone'}
                                                  />
                                              )}
                                              {tab.count !== null && tab.count !== undefined && (
                                                  <span
                                                      className={clsx(
                                                          'absolute -top-1.5 left-full -ml-1.5 min-w-[1.1rem] px-1 rounded-full text-[11px] font-bold leading-4 text-center',
                                                          isActive
                                                              ? 'bg-white/20 text-white'
                                                              : 'bg-black/8 dark:bg-white/10 text-black/70 dark:text-white/70'
                                                      )}
                                                  >
                                                      {tab.count}
                                                  </span>
                                              )}
                                          </span>
                                          <span>{tab.label}</span>
                                      </button>
                                  );
                              }

                              return (
                                  <button
                                      key={tab.id}
                                      type="button"
                                      role="tab"
                                      id={`tab-${tab.id}`}
                                      aria-selected={isActive}
                                      aria-controls={`panel-${tab.id}`}
                                      onClick={() => onTabChange?.(tab.id)}
                                      className={clsx(
                                          'min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200',
                                          isActive
                                              ? 'bg-navy text-white shadow-xs'
                                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-black/4 dark:hover:bg-white/5',
                                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy'
                                      )}
                                  >
                                      {Icon && (
                                          <Icon
                                              className={clsx(
                                                  'w-4 h-4 transition-colors',
                                                  isActive
                                                      ? 'text-white'
                                                      : 'text-slate-500 dark:text-slate-400'
                                              )}
                                              weight={isActive ? 'fill' : 'duotone'}
                                          />
                                      )}
                                      <span>{tab.label}</span>
                                      {tab.count !== null && tab.count !== undefined && (
                                          <span
                                              className={clsx(
                                                  'text-xs px-2 py-0.5 rounded-full',
                                                  isActive
                                                      ? 'bg-white/20 text-white'
                                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                              )}
                                          >
                                              {tab.count}
                                          </span>
                                      )}
                                  </button>
                              );
                          })}
                </nav>
            </div>
        </div>
    );
}
