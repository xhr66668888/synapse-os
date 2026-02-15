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
    Sparkles
} from 'lucide-react';
import { useAIAssistantStore } from '@/lib/ai-assistant-store';

// PanShaker 自定义图标组件
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
    { path: '/panshaker', label: 'PanShaker', icon: PanShakerIcon, highlight: true, isCustomIcon: true },
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
        <aside className="fixed left-0 top-0 h-screen w-60 bg-white/80 backdrop-blur-xl border-r border-border shadow-lg z-50 flex flex-col">
            {/* Logo Area - 点击打开 AI 助手 */}
            <button
                onClick={openAIAssistant}
                className="h-24 flex items-center justify-center px-3 border-b border-border/50 hover:bg-gradient-to-r hover:from-primary/5 hover:to-purple-500/5 transition-all duration-300 group relative"
                title="点击打开 AI 助手"
            >
                <Image
                    src="/synapseoslogo.png"
                    alt="Synapse OS"
                    width={220}
                    height={64}
                    className="object-contain group-hover:scale-[1.02] transition-transform"
                    priority
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-xs text-primary font-medium">AI</span>
                </div>
            </button>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    const isCustomIcon = 'isCustomIcon' in item && item.isCustomIcon;

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                } ${item.highlight ? 'ring-1 ring-primary/20' : ''}`}
                        >
                            {isCustomIcon ? (
                                <span className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`}>
                                    <Icon className="w-5 h-5" />
                                </span>
                            ) : (
                                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`} />
                            )}
                            <span className="font-medium">{item.label}</span>
                            {item.highlight && !isActive && (
                                <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-border/50 bg-bg-secondary/50">
                <Link href="/profile" className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-all">
                    <Image
                        src="/profile.jpeg"
                        alt="User Avatar"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover shadow-inner"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate text-text-primary">Demo 餐厅</div>
                        <div className="text-xs text-text-muted truncate">管理员</div>
                    </div>
                    <LogOut className="w-4 h-4 text-text-muted hover:text-error transition-colors" />
                </Link>
                <div className="text-center mt-3">
                    <p className="text-[10px] text-text-muted font-mono opacity-60">v1.2.0 • Build 20240401</p>
                </div>
            </div>
        </aside>
    );
}
