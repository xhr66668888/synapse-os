import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TastePreference, User } from '../types/database';

// 用户状态
interface UserStore {
    // 当前登录用户
    currentUser: User | null;
    isAuthenticated: boolean;

    // 口味偏好 (Gold 专属)
    tastePreference: TastePreference | null;

    // 登录历史 (用于演示，实际应使用 Supabase Auth)
    savedUsers: User[];

    // 操作
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;

    // 口味偏好操作
    updateTastePreference: (preference: Partial<TastePreference>) => void;
    getTastePreference: () => TastePreference;
}

// 默认口味偏好 (中等值)
const defaultTastePreference: TastePreference = {
    id: '',
    user_id: '',
    salt_level: 3,
    spice_level: 3,
    oil_level: 3,
    sweetness: 3,
    updated_at: new Date().toISOString(),
};

// 模拟用户数据
const mockUsers: User[] = [
    {
        id: 'user-1',
        email: 'demo@synapse.os',
        name: 'Demo 用户',
        role: 'customer',
        created_at: new Date().toISOString(),
    },
];

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,
            tastePreference: null,
            savedUsers: mockUsers,

            login: async (email, password) => {
                // 模拟登录逻辑
                // TODO: 对接实际认证系统

                const user = get().savedUsers.find(u => u.email === email);

                if (user) {
                    set({
                        currentUser: user,
                        isAuthenticated: true,
                        tastePreference: { ...defaultTastePreference, user_id: user.id },
                    });
                    console.log('🔐 [Auth] Login successful:', email);
                    return { success: true };
                }

                // 演示模式：任意邮箱密码都可登录
                if (email && password) {
                    const newUser: User = {
                        id: `user-${Date.now()}`,
                        email,
                        name: email.split('@')[0],
                        role: 'customer',
                        created_at: new Date().toISOString(),
                    };

                    set(state => ({
                        currentUser: newUser,
                        isAuthenticated: true,
                        savedUsers: [...state.savedUsers, newUser],
                        tastePreference: { ...defaultTastePreference, user_id: newUser.id },
                    }));

                    console.log('🔐 [Auth] New user created and logged in:', email);
                    return { success: true };
                }

                return { success: false, error: '请输入邮箱和密码' };
            },

            logout: () => {
                console.log('🔐 [Auth] Logout');
                set({
                    currentUser: null,
                    isAuthenticated: false,
                    tastePreference: null,
                });
            },

            register: async (email, password, name) => {
                // 检查是否已存在
                if (get().savedUsers.find(u => u.email === email)) {
                    return { success: false, error: '该邮箱已注册' };
                }

                const newUser: User = {
                    id: `user-${Date.now()}`,
                    email,
                    name,
                    role: 'customer',
                    created_at: new Date().toISOString(),
                };

                set(state => ({
                    savedUsers: [...state.savedUsers, newUser],
                    currentUser: newUser,
                    isAuthenticated: true,
                    tastePreference: { ...defaultTastePreference, user_id: newUser.id },
                }));

                console.log('🔐 [Auth] Registration successful:', email);
                return { success: true };
            },

            updateTastePreference: (preference) => {
                set(state => ({
                    tastePreference: state.tastePreference
                        ? { ...state.tastePreference, ...preference, updated_at: new Date().toISOString() }
                        : { ...defaultTastePreference, ...preference },
                }));
                console.log('🎛️ [Taste] Preference updated:', preference);
            },

            getTastePreference: () => {
                return get().tastePreference || defaultTastePreference;
            },
        }),
        {
            name: 'synapse-user-storage',
            partialize: (state) => ({
                currentUser: state.currentUser,
                isAuthenticated: state.isAuthenticated,
                tastePreference: state.tastePreference,
                savedUsers: state.savedUsers,
            }),
        }
    )
);

// 快捷 Hooks
export const useCurrentUser = () => useUserStore(state => state.currentUser);
export const useIsAuthenticated = () => useUserStore(state => state.isAuthenticated);
export const useTastePreference = () => useUserStore(state => state.tastePreference);
