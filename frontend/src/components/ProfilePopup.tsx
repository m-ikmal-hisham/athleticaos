import { useState } from 'react';
import { ChevronRight, Users, Bell, UserPlus, Shield, Gift, Settings, LogOut, Edit2, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { usersApi } from '@/api/users.api';

interface ProfilePopupProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfilePopup = ({ isOpen, onClose }: ProfilePopupProps) => {
    const { user, logout, setUser } = useAuthStore();
    const navigate = useNavigate();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleLogout = () => {
        logout();
        onClose();
        navigate('/login');
    };

    const handleEditProfile = () => {
        setEditForm({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || ''
        });
        setIsEditModalOpen(true);
    };

    const handleSaveProfile = async () => {
        if (!user?.id) return;

        try {
            setIsSaving(true);
            setError('');

            const updateData = {
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                email: editForm.email,
                phone: editForm.phone,
                roles: user.roles,
                organisationId: user.organisationId,
                isActive: user.isActive
            };

            await usersApi.updateUser(user.id, updateData);

            // Update local user state
            setUser({
                ...user,
                firstName: editForm.firstName,
                lastName: editForm.lastName,
                email: editForm.email,
                phone: editForm.phone
            });

            setIsEditModalOpen(false);
        } catch (err) {
            setError('Failed to update profile. Please try again.');
            console.error('Profile update error:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
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
                            <button
                                onClick={handleEditProfile}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                title="Edit Profile"
                            >
                                <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Set up Profile CTA */}
                    <div className="px-4 py-2">
                        <div className="bg-gray-50 dark:bg-[#2C2C2E]/50 rounded-xl p-4">
                            <button
                                onClick={handleEditProfile}
                                className="text-primary-500 font-medium text-sm mb-1 hover:underline"
                            >
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

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-foreground">Edit Profile</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        First Name
                                    </label>
                                    <Input
                                        value={editForm.firstName}
                                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                                        placeholder="First Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Last Name
                                    </label>
                                    <Input
                                        value={editForm.lastName}
                                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                                        placeholder="Last Name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Email
                                </label>
                                <Input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Phone
                                </label>
                                <Input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="+60123456789"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                            <Button
                                variant="cancel"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
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
