'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// 用户类型
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'manager' | 'staff' | 'cashier';
    restaurantId: string;
    restaurantName: string;
}

// 认证上下文类型
interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token 管理
const TOKEN_KEY = 'synapse_access_token';
const REFRESH_TOKEN_KEY = 'synapse_refresh_token';

function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
}

function setStoredTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
}

function clearStoredTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Provider 组件
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkAuth = useCallback(async () => {
        const token = getStoredToken();
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const userData = await response.json();
                setUser({
                    id: userData.id,
                    email: userData.email,
                    name: userData.name || userData.email,
                    role: userData.role,
                    restaurantId: userData.restaurant_id,
                    restaurantName: userData.restaurant_name || 'Restaurant',
                });
            } else {
                clearStoredTokens();
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // 开发模式：使用 Mock 用户
            if (process.env.NODE_ENV === 'development') {
                setUser({
                    id: 'dev-user',
                    email: 'admin@demo.com',
                    name: 'Demo Admin',
                    role: 'owner',
                    restaurantId: 'default',
                    restaurantName: 'Demo 餐厅',
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setIsLoading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const data = await response.json();
            setStoredTokens(data.access_token, data.refresh_token);

            // 获取用户信息
            await checkAuth();
            router.push('/');
        } catch (error) {
            // 开发模式：Mock 登录
            if (process.env.NODE_ENV === 'development' && email === 'admin@demo.com') {
                setStoredTokens('dev-token');
                setUser({
                    id: 'dev-user',
                    email: 'admin@demo.com',
                    name: 'Demo Admin',
                    role: 'owner',
                    restaurantId: 'default',
                    restaurantName: 'Demo 餐厅',
                });
                router.push('/');
                return;
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [checkAuth, router]);

    const logout = useCallback(() => {
        clearStoredTokens();
        setUser(null);
        router.push('/login');
    }, [router]);

    // 初始化认证状态
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// Hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// 角色权限检查
export function useRequireAuth(allowedRoles?: User['role'][]) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }

        if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
            router.push('/unauthorized');
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, router]);

    return { user, isLoading, hasAccess: user && (!allowedRoles || allowedRoles.includes(user.role)) };
}

// API 请求工具（带认证）
export async function authFetch(url: string, options: RequestInit = {}) {
    const token = getStoredToken();

    const headers = new Headers(options.headers);
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Token 过期处理
    if (response.status === 401) {
        clearStoredTokens();
        window.location.href = '/login';
    }

    return response;
}
