import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { DotsThreeOutline, SignIn, SquaresFour } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth.store';
import {
    PUBLIC_PRIMARY_NAV,
    PUBLIC_MORE_NAV,
    PUBLIC_NAV_LABELS,
    isNavItemActive,
    isMoreActive,
} from '@/config/navigation';
import { BottomSheet } from './BottomSheet';

const itemBase =
    'flex flex-1 flex-col items-center justify-center gap-1 min-h-[44px] h-16 px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint';
const activeCls = 'text-navy dark:text-navy-tint';
const inactiveCls = 'text-black/72 dark:text-white/72 hover:text-navy dark:hover:text-navy-tint';

const sheetRow =
    'flex items-center gap-3 w-full min-h-[48px] px-3 rounded-[10px] text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint';

/**
 * Phone / portrait-tablet primary navigation (< lg). Fixed bottom, z-30:
 * Modal, BottomSheet and Select all portal to body at z-40/50 and sit above it.
 */
export function PublicBottomNav() {
    const { pathname } = useLocation();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreActive = isMoreActive(pathname);

    const authItem = isAuthenticated
        ? { label: PUBLIC_NAV_LABELS.dashboard, to: '/dashboard', icon: SquaresFour }
        : { label: PUBLIC_NAV_LABELS.signIn, to: '/login', icon: SignIn };
    const AuthIcon = authItem.icon;

    return (
        <>
            <nav
                aria-label={PUBLIC_NAV_LABELS.primaryNav}
                className="print:hidden lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/90 dark:bg-deep-navy/90 backdrop-blur-nav border-t border-black/10 dark:border-white/12 pb-[env(safe-area-inset-bottom,0px)]"
            >
                <ul className="flex items-stretch max-w-3xl mx-auto">
                    {PUBLIC_PRIMARY_NAV.map((item) => {
                        const active = isNavItemActive(item, pathname);
                        const Icon = item.icon;
                        return (
                            <li key={item.key} className="flex flex-1 min-w-0">
                                <Link
                                    to={item.to}
                                    aria-current={active ? 'page' : undefined}
                                    className={clsx(itemBase, active ? activeCls : inactiveCls)}
                                >
                                    <Icon size={24} weight={active ? 'fill' : 'duotone'} aria-hidden="true" />
                                    <span className="truncate max-w-full">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                    <li className="flex flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setMoreOpen(true)}
                            aria-haspopup="dialog"
                            aria-expanded={moreOpen}
                            className={clsx(itemBase, moreActive ? activeCls : inactiveCls)}
                        >
                            <DotsThreeOutline size={24} weight={moreActive ? 'fill' : 'duotone'} aria-hidden="true" />
                            <span className="truncate max-w-full">{PUBLIC_NAV_LABELS.more}</span>
                        </button>
                    </li>
                </ul>
            </nav>

            <BottomSheet
                isOpen={moreOpen}
                onClose={() => setMoreOpen(false)}
                title={PUBLIC_NAV_LABELS.more}
                className="lg:hidden"
            >
                <ul className="space-y-1 pb-2">
                    {PUBLIC_MORE_NAV.map((item) => {
                        const active = isNavItemActive(item, pathname);
                        const Icon = item.icon;
                        return (
                            <li key={item.key}>
                                <Link
                                    to={item.to}
                                    onClick={() => setMoreOpen(false)}
                                    aria-current={active ? 'page' : undefined}
                                    className={clsx(
                                        sheetRow,
                                        active
                                            ? 'bg-navy/[0.08] dark:bg-navy-tint/12 text-navy dark:text-navy-tint'
                                            : 'text-content-primary hover:bg-surface-sunken'
                                    )}
                                >
                                    <Icon size={20} weight={active ? 'fill' : 'duotone'} aria-hidden="true" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                    <li className="pt-1 mt-1 border-t border-line-subtle">
                        <Link
                            to={authItem.to}
                            onClick={() => setMoreOpen(false)}
                            className={clsx(sheetRow, 'text-content-primary hover:bg-surface-sunken')}
                        >
                            <AuthIcon size={20} aria-hidden="true" />
                            {authItem.label}
                        </Link>
                    </li>
                </ul>
            </BottomSheet>
        </>
    );
}
