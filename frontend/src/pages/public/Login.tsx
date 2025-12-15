import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { useAuthStore } from '@/store/auth.store';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            setIsLoading(true);
            await login(data);

            // Get role-based default route
            const defaultRoute = useAuthStore.getState().getDefaultRoute();

            // Redirect to the page they tried to visit or role-based default
            const state = location.state as { from?: { pathname: string } } | null;
            const from = state?.from?.pathname || defaultRoute;
            navigate(from, { replace: true });
        } catch (err: unknown) {
            // Error is already handled by toast in the store
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="auth-container flex flex-col items-center w-full max-w-md mx-auto">
            <img src="/logo.png" alt="AthleticaOS" className="h-16 w-auto mb-8 drop-shadow-lg" />

            <Card className="w-full">
                <h2 className="text-2xl font-bold text-center mb-6 text-foreground">Welcome</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        error={errors.email?.message}
                        {...register('email')}
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        error={errors.password?.message}
                        {...register('password')}
                    />

                    <Button
                        type="submit"
                        className="w-full mt-4"
                        isLoading={isLoading}
                    >
                        Sign In
                    </Button>
                </form>
            </Card>

            <footer className="mt-8 text-center opacity-80">
                <p className="text-sm font-semibold text-foreground">Powered by Ragbi Online</p>
                <p className="text-xs mt-1 text-muted-foreground opacity-70">In collaboration with Infiniteous Creative</p>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-primary hover:text-[#D32F2F] dark:hover:text-[#D32F2F] font-medium transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </footer>
        </div>
    );

};
