'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    ChefHat,
    Armchair,
    ClipboardList,
    UtensilsCrossed,
    Car,
    BarChart3,
    Users,
    Headphones,
    Settings,
    LogOut,
    Music,
    Star,
    UserCircle,
    Package,
    Calendar,
    Utensils,
} from 'lucide-react';
import { useAIAssistantStore } from '@/lib/ai-assistant-store';
import { MuteButton } from '@/components/ui/MuteButton';

const PanShakerIcon = ({ className }: { className?: string }) => (
    <Image
        src="/panshaker-logo.png"
        alt="PanShaker"
        width={20}
        height={20}
        className={`object-contain ${className || ''}`}
    />
);

const menuItems = [
    { path: '/', label: '仪表盘', icon: LayoutDashboard },
    { path: '/pos', label: 'POS 点餐', icon: ShoppingCart },
    { path: '/panshaker', label: 'PanShaker', icon: PanShakerIcon, isCustomIcon: true },
    { path: '/kds', label: '厨房系统', icon: ChefHat },
    { path: '/expo', label: '出餐协调', icon: Utensils },
    { path: '/tables', label: '桌位管理', icon: Armchair },
    { path: '/orders', label: '订单管理', icon: ClipboardList },
    { path: '/menu', label: '菜单管理', icon: UtensilsCrossed },
    { path: '/inventory', label: '库存管理', icon: Package },
    { path: '/schedule', label: '员工排班', icon: Calendar },
    { path: '/delivery', label: '外卖聚合', icon: Car },
    { path: '/reports', label: '报表分析', icon: BarChart3 },
    { path: '/staff', label: '员工管理', icon: Users },
    { path: '/customers', label: '顾客管理', icon: UserCircle },
    { path: '/ai-receptionist', label: 'AI 接线员', icon: Headphones },
    { path: '/music', label: '背景音乐', icon: Music },
    { path: '/auto-review', label: '自动好评', icon: Star },
    { path: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const openAIAssistant = useAIAssistantStore((state) => state.open);

    return (
        <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-dark border-r border-surface-dark-3 z-50 flex flex-col">
            {/* Logo Area */}
            <button
                onClick={openAIAssistant}
                className="h-16 flex items-center justify-center px-3 border-b border-surface-dark-3 hover:bg-surface-dark-2 transition-colors duration-100"
                title="AI 助手"
            >
                <Image
                    src="/synapseoslogo.png"
                    alt="Synapse OS"
                    width={180}
                    height={48}
                    className="object-contain brightness-0 invert opacity-90"
                    priority
                />
            </button>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    const isCustomIcon = 'isCustomIcon' in item && item.isCustomIcon;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-100 ${
                                isActive
                                    ? 'bg-action text-white border-l-[3px] border-l-white'
                                    : 'text-text-muted hover:bg-surface-dark-3 hover:text-white border-l-[3px] border-l-transparent'
                            }`}
                        >
                            {isCustomIcon ? (
                                <span className="w-5 h-5">
                                    <Icon className="w-5 h-5" />
                                </span>
                            ) : (
                                <Icon className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-surface-dark-3">
                <div className="flex items-center gap-2 mb-2">
                    <MuteButton size="sm" />
                </div>
                <Link href="/profile" className="flex items-center gap-3 p-2 rounded-sm hover:bg-surface-dark-2 transition-colors cursor-pointer">
                    <Image
                        src="/profile.jpeg"
                        alt="User Avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-sm object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate text-white">Demo 餐厅</div>
                        <div className="text-xs text-text-muted truncate">管理员</div>
                    </div>
                    <LogOut className="w-4 h-4 text-text-muted hover:text-danger transition-colors" />
                </Link>
                <div className="text-center mt-2">
                    <p className="text-[10px] text-text-muted font-mono opacity-60">v1.2.0</p>
                </div>
            </div>
        </aside>
    );
}
