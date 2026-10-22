import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CaretRight,
    SignOut,
    ArrowSquareOut,
    ShieldCheck,
    PaintBrush,
} from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { formatRoleName } from '@/utils/stringUtils';
import { getYouPageGroups, YouPageGroup } from '@/config/adminNav';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/Button';

export default function You() {
    const { i18n } = useTranslation();
    const t = i18n.getFixedT('en', 'admin');
    const { user, logout, getPrimaryRole } = useAuthStore();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    const primaryRole = getPrimaryRole() || user?.roles?.[0] || '';
    const formattedRole = formatRoleName(primaryRole);

    const initials =
        `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const photoUrl = (user as any)?.avatarUrl || (user as any)?.profilePhotoUrl;

    const groups: YouPageGroup[] = getYouPageGroups(user);

    const handleLogout = async () => {
        setSigningOut(true);
        try {
            await logout();
            navigate('/login');
        } catch (e) {
            console.error('Logout error', e);
            setSigningOut(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6 pb-6">
            {/* Header Card */}
            <div className="bg-surface-card border border-line-subtle rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-navy text-white flex items-center justify-center font-bold text-lg ring-2 ring-line-subtle">
                        {photoUrl && !avatarError ? (
                            <img
                                src={photoUrl}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={() => setAvatarError(true)}
                            />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-content-primary truncate leading-snug">
                            {user?.firstName} {user?.lastName}
                        </h2>
                        {formattedRole && (
                            <p className="text-sm font-medium text-navy dark:text-navy-tint truncate">
                                {formattedRole}
                            </p>
                        )}
                        {user?.organisationName && (
                            <p className="text-xs text-content-secondary truncate mt-0.5">
                                {user.organisationName}
                            </p>
                        )}
                    </div>
                </div>

                {/* Profile Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-line-subtle">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => navigate('/dashboard/profile')}
                    >
                        {t('you.viewProfile')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => navigate('/dashboard/profile/edit')}
                    >
                        {t('you.editProfile')}
                    </Button>
                </div>
            </div>

            {/* Dynamic Navigation Groups */}
            {groups.map((group) => {
                const groupTitle = t(`you.groups.${group.id}`);
                return (
                    <div key={group.id} className="space-y-2">
                        <h3 className="px-3 text-xs font-semibold text-content-tertiary uppercase tracking-wider">
                            {groupTitle}
                        </h3>
                        <div className="bg-surface-card border border-line-subtle rounded-2xl overflow-hidden divide-y divide-line-subtle shadow-sm">
                            {group.items.map((item) => (
                                <Link
                                    key={item.key}
                                    to={item.path}
                                    className="flex items-center justify-between min-h-[48px] px-4 py-3 text-content-primary hover:bg-surface-sunken transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="shrink-0 text-content-secondary group-hover:text-navy dark:group-hover:text-navy-tint transition-colors">
                                            {item.icon}
                                        </span>
                                        <span className="text-sm font-medium truncate">
                                            {t(`you.rows.${item.key}`, { defaultValue: item.label })}
                                        </span>
                                    </div>
                                    <CaretRight
                                        size={16}
                                        weight="bold"
                                        className="shrink-0 text-content-tertiary group-hover:text-content-secondary transition-colors"
                                    />
                                </Link>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* App Group */}
            <div className="space-y-2">
                <h3 className="px-3 text-xs font-semibold text-content-tertiary uppercase tracking-wider">
                    {t('you.groups.app')}
                </h3>
                <div className="bg-surface-card border border-line-subtle rounded-2xl overflow-hidden divide-y divide-line-subtle shadow-sm">
                    {/* Appearance */}
                    <div className="flex items-center justify-between min-h-[48px] px-4 py-2.5">
                        <div className="flex items-center gap-3">
                            <PaintBrush size={20} className="text-content-secondary" />
                            <span className="text-sm font-medium text-content-primary">
                                {t('you.rows.appearance')}
                            </span>
                        </div>
                        <ThemeToggle />
                    </div>

                    {/* View public site */}
                    <Link
                        to="/"
                        className="flex items-center justify-between min-h-[48px] px-4 py-3 text-content-primary hover:bg-surface-sunken transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                    >
                        <div className="flex items-center gap-3">
                            <ArrowSquareOut size={20} className="text-content-secondary group-hover:text-navy dark:group-hover:text-navy-tint transition-colors" />
                            <span className="text-sm font-medium">
                                {t('you.rows.viewPublicSite')}
                            </span>
                        </div>
                        <CaretRight size={16} weight="bold" className="text-content-tertiary group-hover:text-content-secondary transition-colors" />
                    </Link>

                    {/* Privacy & terms */}
                    <Link
                        to="/privacy"
                        className="flex items-center justify-between min-h-[48px] px-4 py-3 text-content-primary hover:bg-surface-sunken transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy dark:focus-visible:ring-navy-tint"
                    >
                        <div className="flex items-center gap-3">
                            <ShieldCheck size={20} className="text-content-secondary group-hover:text-navy dark:group-hover:text-navy-tint transition-colors" />
                            <span className="text-sm font-medium">
                                {t('you.rows.privacyTerms')}
                            </span>
                        </div>
                        <CaretRight size={16} weight="bold" className="text-content-tertiary group-hover:text-content-secondary transition-colors" />
                    </Link>
                </div>
            </div>

            {/* Sign Out Group */}
            <div className="bg-surface-card border border-line-subtle rounded-2xl overflow-hidden shadow-sm">
                <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between min-h-[48px] px-4 py-3 text-crimson dark:text-crimson-tint hover:bg-crimson/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson"
                >
                    <div className="flex items-center gap-3">
                        <SignOut size={20} weight="bold" />
                        <span className="text-sm font-medium">
                            {signingOut ? t('you.signingOut') : t('you.signOut')}
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}
