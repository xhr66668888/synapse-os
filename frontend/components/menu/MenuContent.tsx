'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StateBadge, DataTable, type DataTableColumn, SectionHeader, BulkActionBar } from '@/components/ui';
import {
    Search,
    Plus,
    Edit,
    Eye,
    EyeOff,
    Trash2,
    LayoutGrid,
    List,
} from 'lucide-react';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    available: boolean;
    soldToday: number;
}

const mockCategories = [
    { id: 'all', name: '全部菜品' },
    { id: 'hot', name: '热门推荐' },
    { id: 'main', name: '主食点心' },
    { id: 'dish', name: '经典炒菜' },
    { id: 'drink', name: '特色饮品' },
];

const mockItems: MenuItem[] = [
    { id: '1', name: '宫保鸡丁', price: 38, category: 'dish', description: '经典川菜，花生米香脆', available: true, soldToday: 45 },
    { id: '2', name: '麻婆豆腐', price: 22, category: 'dish', description: '麻辣鲜香，下饭神器', available: true, soldToday: 32 },
    { id: '3', name: '扬州炒饭', price: 28, category: 'main', description: '粒粒分明，配料丰富', available: true, soldToday: 56 },
    { id: '4', name: '可口可乐', price: 6, category: 'drink', description: '冰镇快乐水', available: true, soldToday: 89 },
    { id: '5', name: '糖醋排骨', price: 58, category: 'dish', description: '酸甜适口，老少皆宜', available: false, soldToday: 0 },
    { id: '6', name: '水煮鱼', price: 88, category: 'dish', description: '虽然有点辣，但是很过瘾', available: true, soldToday: 12 },
];

const columns: DataTableColumn<MenuItem>[] = [
    { key: 'name', label: '菜品名称', sortable: true, render: (row) => (
        <span className="font-bold text-text-primary">{row.name}</span>
    )},
    { key: 'category', label: '分类', render: (row) => (
        <span className="text-text-secondary text-xs">{mockCategories.find(c => c.id === row.category)?.name || row.category}</span>
    )},
    { key: 'price', label: '价格', type: 'currency', sortable: true, render: (row) => (
        <span className="font-mono tabular-nums font-bold">¥{row.price.toFixed(2)}</span>
    )},
    { key: 'available', label: '状态', type: 'badge', render: (row) => (
        <StateBadge state={row.available ? 'listed' : 'delisted'} />
    )},
    { key: 'soldToday', label: '今日售出', type: 'number', sortable: true, render: (row) => (
        <span className="font-mono tabular-nums">{row.soldToday}</span>
    )},
    { key: 'actions', label: '操作', type: 'actions', width: '120px', render: (row) => (
        <div className="flex gap-1">
            <button className="p-1.5 hover:bg-surface-sunken rounded-xs text-text-secondary transition-colors" title="编辑">
                <Edit className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-sunken rounded-xs text-text-secondary transition-colors" title={row.available ? '下架' : '上架'}>
                {row.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button className="p-1.5 hover:bg-danger-bg rounded-xs text-text-secondary hover:text-danger transition-colors" title="删除">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )},
];

export function MenuContent() {
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());

    const filteredItems = mockItems.filter(item =>
        (activeCategory === 'all' || item.category === activeCategory) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-surface-base p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                <SectionHeader
                    title="菜单管理"
                    subtitle={`今日售出 ${mockItems.reduce((acc, cur) => acc + cur.soldToday, 0)} 份`}
                    count={mockItems.length}
                />
                <div className="flex gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="搜索菜品..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-base pl-9 w-56"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    </div>
                    <div className="flex border border-border rounded-sm overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-action text-action-fg' : 'text-text-muted hover:bg-surface-sunken'}`}
                            title="表格视图"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-action text-action-fg' : 'text-text-muted hover:bg-surface-sunken'}`}
                            title="网格视图"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="btn-action text-sm">
                        <Plus className="w-4 h-4" /> 新增菜品
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-5 overflow-x-auto">
                {mockCategories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-sm text-sm font-bold whitespace-nowrap transition-colors ${
                            activeCategory === cat.id
                                ? 'bg-action text-action-fg'
                                : 'bg-surface-raised text-text-secondary border border-border hover:bg-surface-sunken'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Bulk Action Bar */}
            {selectedKeys.size > 0 && (
                <div className="mb-3">
                    <BulkActionBar
                        selectedCount={selectedKeys.size}
                        actions={[
                            { label: '批量上架', onClick: () => {} },
                            { label: '批量下架', onClick: () => {}, variant: 'danger' },
                            { label: '批量改价', onClick: () => {} },
                        ]}
                        onClearSelection={() => setSelectedKeys(new Set())}
                    />
                </div>
            )}

            {/* Content */}
            {viewMode === 'table' ? (
                <div className="card-base overflow-hidden">
                    <DataTable
                        columns={columns}
                        data={filteredItems}
                        rowKey={(row) => row.id}
                        selectable
                        selectedKeys={selectedKeys}
                        onSelectionChange={setSelectedKeys}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="card-base p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-text-primary">{item.name}</h3>
                                <StateBadge state={item.available ? 'listed' : 'delisted'} size="sm" />
                            </div>
                            <p className="text-xs text-text-muted mb-3">{item.description}</p>
                            <div className="flex justify-between items-center pt-3 border-t border-border-light">
                                <span className="font-bold font-mono tabular-nums text-text-primary">¥{item.price.toFixed(2)}</span>
                                <span className="text-xs text-text-muted font-mono tabular-nums">售出 {item.soldToday}</span>
                            </div>
                            <div className="flex gap-1 mt-3">
                                <button className="p-1.5 hover:bg-surface-sunken rounded-xs text-text-secondary transition-colors">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-1.5 hover:bg-surface-sunken rounded-xs text-text-secondary transition-colors">
                                    {item.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button className="p-1.5 hover:bg-danger-bg rounded-xs text-text-secondary hover:text-danger transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button className="border-2 border-dashed border-border rounded-md flex flex-col items-center justify-center text-text-muted hover:text-action hover:border-action transition-colors min-h-[200px] gap-2">
                        <Plus className="w-6 h-6" />
                        <span className="text-sm font-bold">添加新菜品</span>
                    </button>
                </div>
            )}
        </div>
    );
}
