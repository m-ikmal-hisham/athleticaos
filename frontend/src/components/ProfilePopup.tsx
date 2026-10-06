import { useState } from 'react';
import { CaretRight, SignOut, User, Pencil } from '@phosphor-icons/react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/Modal';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfilePopup = ({ isOpen, onClose }: ProfilePopupProps) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);

    const handleLogout = async () => {
        setSigningOut(true);
        await logout();
    };

    const handleNavigate = (path: string) => {
        onClose();
        navigate(path);
    };

    const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'U';
    const isPlayer = user?.roles?.includes('ROLE_PLAYER');

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Account" size="sm">
            <div className="space-y-4">
                {/* Header */}
                <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-black dark:text-white truncate">
                            {user?.firstName} {user?.lastName}
                        </h3>
                        <p className="text-sm text-black/72 dark:text-white/72 truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>

                {/* Set up profile CTA (Players only) */}
                {isPlayer && (
                    <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4">
                        <button
                            type="button"
                            onClick={() => handleNavigate('/dashboard/profile/edit')}
                            className="text-navy dark:text-navy-tint font-medium text-sm mb-1 hover:underline text-left block"
                        >
                            Set up your player profile
                        </button>
                        <p className="text-sm text-black/72 dark:text-white/72 leading-snug">
                            Add your details so your stats appear on your public profile.
                        </p>
                    </div>
                )}

                {/* Navigation Rows */}
                <div className="bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden divide-y divide-black/10 dark:divide-white/10">
                    <button
                        type="button"
                        onClick={() => handleNavigate('/dashboard/profile')}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-black dark:text-white"
                    >
                        <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-black/72 dark:text-white/72 group-hover:text-black dark:group-hover:text-white" />
                            <span className="text-sm font-medium">View profile</span>
                        </div>
                        <CaretRight className="w-4 h-4 text-black/60 dark:text-white/60 group-hover:text-black/90 dark:group-hover:text-white/90" />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNavigate('/dashboard/profile/edit')}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-black dark:text-white"
                    >
                        <div className="flex items-center gap-3">
                            <Pencil className="w-5 h-5 text-black/72 dark:text-white/72 group-hover:text-black dark:group-hover:text-white" />
                            <span className="text-sm font-medium">Edit profile</span>
                        </div>
                        <CaretRight className="w-4 h-4 text-black/60 dark:text-white/60 group-hover:text-black/90 dark:group-hover:text-white/90" />
                    </button>
                </div>

                {/* Sign Out Group */}
                <div className="bg-black/5 dark:bg-white/5 rounded-xl overflow-hidden">
                    <button
                        type="button"
                        disabled={signingOut}
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed group text-crimson dark:text-crimson-tint"
                    >
                        <div className="flex items-center gap-3">
                            <SignOut className="w-5 h-5 text-crimson dark:text-crimson-tint" />
                            <span className="text-sm font-medium">{signingOut ? 'Signing out…' : 'Sign out'}</span>
                        </div>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
