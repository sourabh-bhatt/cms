'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
    onSuccess?: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            onSuccess?.();
        } else {
            setError(result.error || 'Login failed');
        }

        setIsLoading(false);
    };

    const quickLogin = async (userEmail: string, userPassword: string) => {
        setEmail(userEmail);
        setPassword(userPassword);
        setError('');
        setIsLoading(true);

        const result = await login(userEmail, userPassword);

        if (result.success) {
            onSuccess?.();
        } else {
            setError(result.error || 'Login failed');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 text-white rounded-xl mb-4">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Course Creator</h1>
                    <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                                required
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    {/* Quick Login */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-center text-gray-400 text-xs mb-3">Quick Login</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => quickLogin('sourabh@bluesky.com', 'sourabh@123')}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Sourabh
                            </button>
                            <button
                                onClick={() => quickLogin('kaveh@bluesky.com', 'kaveh@123')}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Kaveh
                            </button>
                            <button
                                onClick={() => quickLogin('ayush@bluesky.com', 'ayush@123')}
                                disabled={isLoading}
                                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                Ayush
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    Blue Sky Online © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
