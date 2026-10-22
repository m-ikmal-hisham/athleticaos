import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { clsx } from 'clsx';
import { useSpotlightTournament } from '@/hooks/useSpotlightTournament';
import { useUIStore } from '@/store/ui.store';
import { BottomSheet } from '@/components/public/BottomSheet';
import { Modal } from '@/components/Modal';
import { TournamentLogo } from '@/components/common/TournamentLogo';
import { PublicTournamentSummary } from '@/api/public.api';

interface TournamentSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TournamentSwitcher({ isOpen, onClose }: TournamentSwitcherProps) {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');
    const { tournaments, refetch } = useSpotlightTournament({ isAdmin: true });
    const activeTournamentId = useUIStore((s) => s.activeTournamentId);
    const setActiveTournamentId = useUIStore((s) => s.setActiveTournamentId);

    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') return window.innerWidth < 1024;
        return true;
    });

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Refetch when switcher opens
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            void refetch();
        }
    }, [isOpen, refetch]);

    const handleSelect = (tournamentId: string) => {
        setActiveTournamentId(tournamentId);
        onClose();
    };

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return tournaments;
        const q = searchTerm.toLowerCase().trim();
        return tournaments.filter((t) => t.name.toLowerCase().includes(q));
    }, [tournaments, searchTerm]);

    const groups = useMemo(() => {
        const live = filtered.filter((t) => t.live);
        const upcoming = filtered.filter((t) => !t.live && !t.completed);
        const recent = filtered.filter((t) => t.completed);
        return [
            { key: 'live', label: t('switcher.groups.live'), items: live },
            { key: 'upcoming', label: t('switcher.groups.upcoming'), items: upcoming },
            { key: 'recent', label: t('switcher.groups.recent'), items: recent },
        ].filter((g) => g.items.length > 0);
    }, [filtered, t]);

    const renderItem = (item: PublicTournamentSummary) => {
        const isSelected = item.id === activeTournamentId;
        return (
            <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={clsx(
                    'w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-colors',
                    isSelected
                        ? 'bg-navy/10 dark:bg-white/10 text-navy dark:text-navy-tint font-medium'
                        : 'text-content-primary hover:bg-black/5 dark:hover:bg-white/5'
                )}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-surface-sunken flex items-center justify-center overflow-hidden shrink-0 border border-line-subtle">
                        {item.logoUrl || item.organiserBranding?.logoUrl ? (
                            <TournamentLogo
                                tournamentId={item.id}
                                logoUrl={item.logoUrl || item.organiserBranding?.logoUrl}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <Trophy size={18} className="text-content-secondary" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate text-content-primary">
                                {item.name}
                            </span>
                            {item.live && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-crimson text-white text-[10px] font-bold uppercase tracking-wider">
                                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                                    {t('switcher.groups.live')}
                                </span>
                            )}
                        </div>
                        {item.organiserName && (
                            <p className="text-xs text-content-secondary truncate">
                                {item.organiserName}
                            </p>
                        )}
                    </div>
                </div>
                {isSelected && (
                    <Check size={18} weight="bold" className="shrink-0 text-navy dark:text-navy-tint" />
                )}
            </button>
        );
    };

    const content = (
        <div className="space-y-4 max-h-[65vh] flex flex-col">
            {/* Search Box */}
            <div className="relative shrink-0">
                <MagnifyingGlass
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary"
                />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('switcher.searchPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 bg-surface-sunken border border-line-subtle rounded-xl text-sm text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-navy-tint"
                />
            </div>

            {/* List */}
            <div className="overflow-y-auto custom-scrollbar space-y-4 flex-1 pr-1">
                {groups.length === 0 ? (
                    <div className="text-center py-8 text-sm text-content-secondary">
                        {t('switcher.emptyState')}
                    </div>
                ) : (
                    groups.map((group) => (
                        <div key={group.key} className="space-y-1">
                            <h4 className="px-2 text-xs font-semibold text-content-tertiary uppercase tracking-wider">
                                {group.label}
                            </h4>
                            <div className="space-y-0.5">
                                {group.items.map(renderItem)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <BottomSheet
                isOpen={isOpen}
                onClose={onClose}
                title={t('switcher.title')}
            >
                {content}
            </BottomSheet>
        );
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('switcher.title')}
            size="md"
        >
            {content}
        </Modal>
    );
}
