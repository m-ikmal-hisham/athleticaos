import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/auth.store';
import { SocialButtons } from '@/components/SocialButtons';

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
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 xl:p-24 bg-white relative z-10">
                <div className="w-full max-w-sm space-y-8">
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        {/* Use original colored logo if available, or just the text/symbol. 
                            Since we have logo-transparent and logo.png, logo.png is likely the colored one suitable for white bg. */}
                        <img
                            src="/athleticaos-logo.svg"
                            alt="AthleticaOS"
                            className="h-16 w-auto mb-6"
                        />
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                            Login
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            Or sign in with email
                        </p>
                    </div>

                    {/* Social Login Section */}
                    <div className="mt-6">
                        <SocialButtons />
                    </div>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1">
                            {/* Label purely for accessibility, hidden visually to match clean design if needed, 
                                but standard design usually has labels or placeholders. Reference shows labels inside or above. 
                                We'll use standard clean inputs. */}
                            <Input
                                type="email"
                                placeholder="Email"
                                error={errors.email?.message}
                                {...register('email')}
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                            />
                        </div>

                        <div className="space-y-1">
                            <Input
                                type="password"
                                placeholder="Password"
                                error={errors.password?.message}
                                {...register('password')}
                                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-purple-500 focus:ring-purple-500 rounded-lg p-3"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                Keep me logged in
                            </label>
                            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3 bg-[#6366f1] hover:bg-[#5558dd] text-white font-semibold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
                            isLoading={isLoading}
                        >
                            Login
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Abstract Art */}
            <div className="hidden lg:flex flex-1 relative bg-white overflow-hidden items-center justify-center p-12">
                <img
                    src="/athleticaos-login-bg-new.png"
                    alt="AthleticaOS Background"
                    className="absolute inset-0 w-full h-full object-cover"
                />


                <div className="relative z-20 max-w-lg text-right">
                    <h2 className="text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                        Changing the way<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-blue-600">
                            the world plays
                        </span>
                    </h2>
                    <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-md ml-auto">
                        Experience the future of rugby management with AthleticaOS.
                        Streamlined, powerful, and built for champions.
                    </p>

                    {/* Decorative subtle grid or dots */}
                    <div className="absolute top-[-40px] right-[-20px] w-24 h-24 opacity-20 bg-dot-pattern">
                    </div>
                </div>
            </div>
        </div>
    );
};
