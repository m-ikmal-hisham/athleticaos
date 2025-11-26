import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { authApi } from '@/api/auth.api';

const registerSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const Signup = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setIsLoading(true);
            setError('');

            await authApi.register({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                password: data.password,
                roles: ['ROLE_USER'],
            });

            // Redirect to login page
            navigate('/login', {
                state: { message: 'Registration successful! Please sign in.' }
            });
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="auth-container flex flex-col items-center w-full max-w-md mx-auto">
            <img src="/logo.png" alt="AthleticaOS" className="h-16 w-auto mb-8 drop-shadow-lg" />

            <Card className="w-full">
                <h2 className="text-2xl font-bold text-center mb-6 text-foreground">Create Account</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            placeholder="First Name"
                            error={errors.firstName?.message}
                            {...register('firstName')}
                        />

                        <Input
                            placeholder="Last Name"
                            error={errors.lastName?.message}
                            {...register('lastName')}
                        />
                    </div>

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

                    <Input
                        type="password"
                        placeholder="Confirm Password"
                        error={errors.confirmPassword?.message}
                        {...register('confirmPassword')}
                    />

                    <Button
                        type="submit"
                        className="w-full mt-4"
                        isLoading={isLoading}
                    >
                        Create Account
                    </Button>
                </form>
            </Card>

            <footer className="mt-8 text-center opacity-80">
                <p className="text-sm font-semibold text-foreground">Powered by Ragbi Online</p>
                <p className="text-xs mt-1 text-muted-foreground opacity-70">In collaboration with Infiniteous Creative</p>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-primary-glow font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </footer>
        </div>
    );

};
