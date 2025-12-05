import { ChevronRight, Users, Bell, UserPlus, Shield, Gift, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfilePopup = ({ isOpen, onClose }: ProfilePopupProps) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-2">
                    <h2 className="text-3xl font-bold tracking-tight text-primary-500 dark:text-primary-300">Account</h2>
                </div>

                {/* User Profile Card */}
                <div className="px-4 py-2">
                    <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-black dark:text-white truncate">
                                {user?.firstName} {user?.lastName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Set up Profile CTA */}
                <div className="px-4 py-2">
                    <div className="bg-gray-50 dark:bg-[#2C2C2E]/50 rounded-xl p-4">
                        <button className="text-primary-500 font-medium text-sm mb-1 hover:underline">
                            Set up Profile
                        </button>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
                            Set up your profile to share your stats and see what your teammates are achieving.
                        </p>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="px-4 py-2">
                    <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700/50">
                        <MenuItem icon={<Users className="w-5 h-5" />} label="Manage Team" />
                        <MenuItem icon={<Bell className="w-5 h-5" />} label="Notifications" />
                        <MenuItem icon={<UserPlus className="w-5 h-5" />} label="Find Teammates" />
                        <MenuItem icon={<Shield className="w-5 h-5" />} label="Apps with Access" />
                    </div>
                </div>

                <div className="px-4 py-2">
                    <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700/50">
                        <MenuItem icon={<Gift className="w-5 h-5" />} label="Redeem Code" />
                    </div>
                </div>

                <div className="px-4 py-2">
                    <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700/50">
                        <MenuItem icon={<Settings className="w-5 h-5" />} label="Account Settings" />
                        <MenuItem
                            icon={<LogOut className="w-5 h-5 text-red-500" />}
                            label="Sign Out"
                            onClick={handleLogout}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-full font-semibold transition-colors shadow-lg shadow-primary-500/20"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

const MenuItem = ({ icon, label, onClick, className }: { icon?: React.ReactNode, label: string, onClick?: () => void, className?: string }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group ${className || ''}`}
    >
        <div className="flex items-center gap-3 text-black dark:text-white">
            {icon}
            <span className="text-[15px] font-medium">{label}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
    </button>
);
