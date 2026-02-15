'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Search,
    Plus,
    Filter,
    MoreHorizontal,
    Image as ImageIcon,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Flame,
    Utensils,
    Pizza,
    Coffee,
    IceCream,
    Euro
} from 'lucide-react';

// Mock Sky
interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    image?: string;
    available: boolean;
    soldToday: number;
}

const mockCategories = [
    { id: 'all', name: '全部菜品', icon: Filter },
    { id: 'hot', name: '热门推荐', icon: Flame },
    { id: 'main', name: '主食点心', icon: Pizza },
    { id: 'dish', name: '经典炒菜', icon: Utensils },
    { id: 'drink', name: '特色饮品', icon: Coffee },
];

const mockItems: MenuItem[] = [
    { id: '1', name: '宫保鸡丁', price: 38, category: 'dish', description: '经典川菜，花生米香脆', available: true, soldToday: 45 },
    { id: '2', name: '麻婆豆腐', price: 22, category: 'dish', description: '麻辣鲜香，下饭神器', available: true, soldToday: 32 },
    { id: '3', name: '扬州炒饭', price: 28, category: 'main', description: '粒粒分明，配料丰富', available: true, soldToday: 56 },
    { id: '4', name: '可口可乐', price: 6, category: 'drink', description: '冰镇快乐水', available: true, soldToday: 89 },
    { id: '5', name: '糖醋排骨', price: 58, category: 'dish', description: '酸甜适口，老少皆宜', available: false, soldToday: 0 },
    { id: '6', name: '水煮鱼', price: 88, category: 'dish', description: '虽然有点辣，但是很过瘾', available: true, soldToday: 12 },
];

export function MenuContent() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredItems = mockItems.filter(item =>
        (activeCategory === 'all' || item.category === activeCategory) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-bg-secondary p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">菜单管理</h1>
                    <p className="text-sm text-text-muted mt-1">共 {mockItems.length} 个菜品，今日售出 {mockItems.reduce((acc, cur) => acc + cur.soldToday, 0)} 份</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索菜品..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    </div>
                    <button className="btn btn-primary shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-1" /> 新增菜品
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none">
                {mockCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border ${isActive
                                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                    : 'bg-white text-text-secondary border-transparent hover:border-border hover:bg-bg-hover'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {cat.name}
                        </button>
                    );
                })}
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <div key={item.id} className="group card p-4 hover:-translate-y-1 transition-all duration-300">
                        {/* Image Area */}
                        <div className="relative aspect-[4/3] rounded-xl bg-bg-secondary mb-4 overflow-hidden">
                            {/* Lucide Placeholder for Image */}
                            <div className="absolute inset-0 flex items-center justify-center text-text-placeholder bg-gray-50 group-hover:bg-gray-100 transition-colors">
                                <div className="text-center">
                                    {/* Dynamic Icon based on Category could be nice, currently generic */}
                                    {item.category === 'drink' ? <Coffee className="w-12 h-12 opacity-20" /> : <Utensils className="w-12 h-12 opacity-20" />}
                                </div>
                            </div>

                            <div className="absolute top-2 right-2">
                                <div className={`px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${item.available
                                        ? 'bg-white/80 text-success'
                                        : 'bg-black/50 text-white'
                                    }`}>
                                    {item.available ? '上架中' : '已估清'}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-text-primary text-lg">{item.name}</h3>
                                <span className="font-bold text-primary">¥{item.price}</span>
                            </div>
                            <p className="text-xs text-text-muted line-clamp-2 h-8">{item.description}</p>

                            <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
                                <span className="text-xs text-text-secondary font-medium bg-bg-secondary px-2 py-1 rounded-lg">
                                    售出 {item.soldToday}
                                </span>

                                <div className="flex gap-1">
                                    <button className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-primary transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 hover:bg-bg-hover rounded-lg text-text-secondary hover:text-primary transition-colors">
                                        {item.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button className="p-2 hover:bg-red-50 rounded-lg text-text-secondary hover:text-error transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Card */}
                <button className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-text-placeholder hover:text-primary hover:border-primary hover:bg-primary/5 transition-all min-h-[300px] gap-3 group">
                    <div className="w-12 h-12 rounded-full bg-bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">添加新菜品</span>
                </button>
            </div>
        </div>
    );
}
