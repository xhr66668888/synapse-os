'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
    const { login, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || '登录失败，请检查邮箱和密码');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl text-white">S</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary">Synapse OS</h1>
                    <p className="text-text-muted mt-1">智能餐饮管理系统</p>
                </div>

                {/* 登录表单 */}
                <div className="card p-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-6 text-center">登录</h2>

                    {error && (
                        <div className="mb-4 p-3 bg-error-bg text-error text-sm rounded-xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                邮箱
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@demo.com"
                                className="form-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                <span className="text-text-secondary">记住我</span>
                            </label>
                            <a href="#" className="text-primary hover:underline">
                                忘记密码？
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary w-full py-3"
                        >
                            {isLoading ? '登录中...' : '登录'}
                        </button>
                    </form>

                    {/* Demo 提示 */}
                    <div className="mt-6 p-4 bg-primary-100 rounded-xl text-center">
                        <p className="text-sm text-text-secondary mb-2">Demo 账号</p>
                        <p className="text-sm font-mono text-primary">admin@demo.com / 任意密码</p>
                    </div>
                </div>

                <p className="text-center text-sm text-text-muted mt-6">
                    © 2024 Synapse OS. All rights reserved.
                </p>
            </div>
        </div>
    );
}
