import { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/auth.store';
import { passwordProblem, PASSWORD_MIN_LENGTH } from '@/utils/password';

interface ForcedPasswordChangeProps {
    email: string;
    currentPassword: string;
    onChanged: () => void;
    onCancel: () => void;
}

// Shown when login returns PASSWORD_CHANGE_REQUIRED. The current password stays in component
// memory only and is sent once to /auth/change-password alongside the new one.
export const ForcedPasswordChange = ({ email, currentPassword, onChanged, onCancel }: ForcedPasswordChangeProps) => {
    const { changePassword } = useAuthStore();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const problem = passwordProblem(newPassword, email)
            ?? (newPassword !== confirmPassword ? 'Passwords do not match' : null);
        if (problem) {
            setError(problem);
            return;
        }
        try {
            setIsLoading(true);
            setError('');
            await changePassword({ email, currentPassword, newPassword });
            onChanged();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Could not change password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-8 bg-white dark:bg-gray-950">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
                <div className="text-center space-y-1.5">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Set a new password</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your account has a temporary password. Choose a new one to continue.
                    </p>
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/20 text-center">
                        {error}
                    </div>
                )}

                <Input
                    type="password"
                    label="New password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    helperText={`At least ${PASSWORD_MIN_LENGTH} characters. Avoid common words.`}
                    required
                />
                <Input
                    type="password"
                    label="Confirm new password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required
                />

                <Button
                    type="submit"
                    className="w-full py-3 bg-[#6366f1] hover:bg-[#5558dd] text-white font-semibold rounded-lg"
                    isLoading={isLoading}
                >
                    Update password
                </Button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Back to login
                </button>
            </form>
        </div>
    );
};
