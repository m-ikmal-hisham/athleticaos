import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { authApi } from '@/api/auth.api';
import { SocialButtons } from '@/components/SocialButtons';

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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white relative z-10 transition-all duration-300">
                <div className="w-full max-w-sm space-y-6">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <img
                            src="/athleticaos-logo-svg-new.svg"
                            alt="AthleticaOS"
                            className="h-14 w-auto mb-6"
                        />
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                            Create Account
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Join the future of rugby management
                        </p>
                    </div>

                    {/* Social Login Section */}
                    <div className="mt-6">
                        <SocialButtons />
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or register with email</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                placeholder="First Name"
                                error={errors.firstName?.message}
                                {...register('firstName')}
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                            />

                            <Input
                                placeholder="Last Name"
                                error={errors.lastName?.message}
                                {...register('lastName')}
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                            />
                        </div>

                        <Input
                            type="email"
                            placeholder="Email"
                            error={errors.email?.message}
                            {...register('email')}
                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                        />

                        <Input
                            type="password"
                            placeholder="Password"
                            error={errors.password?.message}
                            {...register('password')}
                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                        />

                        <Input
                            type="password"
                            placeholder="Confirm Password"
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                        />

                        <Button
                            type="submit"
                            className="w-full py-3 bg-[#6366f1] hover:bg-[#5558dd] text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all mt-2"
                            isLoading={isLoading}
                        >
                            Sign Up
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Abstract Art (Reused from Login) */}
            <div className="hidden lg:flex flex-1 relative bg-white overflow-hidden items-center justify-center p-12 lg:w-1/2">
                <img
                    src="/athleticaos-bg-svg-new.svg"
                    alt="AthleticaOS Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />

                <div className="relative z-20 max-w-lg text-right">
                    <h2 className="text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                        Join the<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-blue-600">
                            Revolution
                        </span>
                    </h2>
                    <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-md ml-auto">
                        Create your profile, manage teams, and compete at the highest level.
                        Your journey starts here.
                    </p>

                    <div className="absolute top-[-40px] right-[-20px] w-24 h-24 opacity-20 bg-dot-pattern">
                    </div>
                </div>
            </div>
        </div>
    );
};
