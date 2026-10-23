import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { UsersThree, Users } from '@phosphor-icons/react';

interface SquadsSegmentedSwitchProps {
    current: 'teams' | 'players';
    className?: string;
}

export function SquadsSegmentedSwitch({ current, className }: SquadsSegmentedSwitchProps) {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');

    const itemBase =
        'flex-1 flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] text-sm font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy dark:focus-visible:ring-navy-tint';

    return (
        <div
            className={clsx(
                'w-full bg-surface-sunken border border-line-subtle p-1 rounded-xl flex items-center gap-1',
                className
            )}
            role="tablist"
            aria-label={t('tabs.squads')}
        >
            <Link
                to="/dashboard/teams"
                role="tab"
                aria-selected={current === 'teams'}
                className={clsx(
                    itemBase,
                    current === 'teams'
                        ? 'bg-surface-card text-navy dark:text-navy-tint font-semibold shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                )}
            >
                <UsersThree size={18} weight={current === 'teams' ? 'fill' : 'duotone'} />
                <span>{t('squadsSwitch.teams')}</span>
            </Link>

            <Link
                to="/dashboard/players"
                role="tab"
                aria-selected={current === 'players'}
                className={clsx(
                    itemBase,
                    current === 'players'
                        ? 'bg-surface-card text-navy dark:text-navy-tint font-semibold shadow-sm'
                        : 'text-content-secondary hover:text-content-primary'
                )}
            >
                <Users size={18} weight={current === 'players' ? 'fill' : 'duotone'} />
                <span>{t('squadsSwitch.players')}</span>
            </Link>
        </div>
    );
}
