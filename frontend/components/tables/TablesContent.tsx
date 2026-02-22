'use client';

import { useState } from 'react';
import {
    Users,
    MapPin,
    Plus,
    Armchair,
    Timer,
    QrCode,
    Download,
    X
} from 'lucide-react';

interface TableData {
    id: string;
    number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    currentOrder?: string;
    guests?: number;
    startTime?: string;
}

const mockTables: TableData[] = [
    { id: 'T01', number: 1, capacity: 2, status: 'occupied', currentOrder: '#1925', guests: 2, startTime: '18:30' },
    { id: 'T02', number: 2, capacity: 2, status: 'available' },
    { id: 'T03', number: 3, capacity: 4, status: 'reserved', startTime: '19:00' },
    { id: 'T04', number: 4, capacity: 4, status: 'cleaning' },
    { id: 'T05', number: 5, capacity: 4, status: 'available' },
    { id: 'T06', number: 6, capacity: 6, status: 'occupied', currentOrder: '#1928', guests: 5, startTime: '18:45' },
    { id: 'T07', number: 7, capacity: 6, status: 'available' },
    { id: 'T08', number: 8, capacity: 8, status: 'available' },
];

const statusConfig: Record<string, { label: string; borderColor: string; bgColor: string; textColor: string }> = {
    available: { label: '空闲', borderColor: 'border-success', bgColor: 'bg-surface-raised', textColor: 'text-success' },
    occupied:  { label: '用餐中', borderColor: 'border-warning', bgColor: 'bg-warning-bg', textColor: 'text-warning' },
    reserved:  { label: '已预订', borderColor: 'border-info', bgColor: 'bg-info-bg', textColor: 'text-info' },
    cleaning:  { label: '清理中', borderColor: 'border-border', bgColor: 'bg-surface-sunken', textColor: 'text-text-muted' },
};

export function TablesContent() {
    const [tables, setTables] = useState<TableData[]>(mockTables);
    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [showQRCode, setShowQRCode] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

    const stats = {
        total: tables.length,
        available: tables.filter(t => t.status === 'available').length,
        occupied: tables.filter(t => t.status === 'occupied').length,
        reserved: tables.filter(t => t.status === 'reserved').length,
    };

    const handleGenerateQR = async () => {
        if (!selectedTable) return;
        try {
            const response = await fetch(`/api/v1/tables/${selectedTable.id}/generate-qr`, { method: 'POST' });
            const data = await response.json();
            setQrCodeUrl(`${window.location.origin}${data.qr_url}`);
            setShowQRCode(true);
        } catch {
            // silently fail
        }
    };

    return (
        <div className="min-h-screen bg-surface-base p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">桌位管理</h1>
                    <p className="text-sm text-text-muted mt-1">
                        空闲 <span className="text-success font-bold font-mono tabular-nums">{stats.available}</span> / 总共 <span className="font-mono tabular-nums">{stats.total}</span> 桌
                    </p>
                </div>
                <button className="btn-action text-sm">
                    <Plus className="w-4 h-4" /> 添加等位
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="card-base p-4">
                    <div className="text-xs text-text-muted mb-1">空闲桌</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-success">{stats.available}</div>
                </div>
                <div className="card-base p-4">
                    <div className="text-xs text-text-muted mb-1">用餐中</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-warning">{stats.occupied}</div>
                </div>
                <div className="card-base p-4">
                    <div className="text-xs text-text-muted mb-1">已预订</div>
                    <div className="text-2xl font-bold font-mono tabular-nums text-info">{stats.reserved}</div>
                </div>
                <div className="card-base p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-text-muted mb-1">平均翻台</div>
                        <div className="text-2xl font-bold font-mono tabular-nums text-text-primary">45m</div>
                    </div>
                    <Timer className="w-5 h-5 text-text-muted" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Floor Plan */}
                <div className="lg:col-span-2 card-base p-5">
                    <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-text-muted" /> 餐厅布局
                    </h2>

                    <div className="grid grid-cols-4 gap-4">
                        {tables.map((table) => {
                            const status = statusConfig[table.status];
                            const isSelected = selectedTable?.id === table.id;

                            return (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={`relative p-4 rounded-sm border-2 transition-colors flex flex-col items-center justify-center min-h-[120px] ${status.bgColor} ${status.borderColor} ${
                                        isSelected ? 'ring-2 ring-action ring-offset-1' : 'hover:brightness-95'
                                    }`}
                                >
                                    <div className="text-2xl font-bold text-text-primary mb-1">{table.number}</div>
                                    <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
                                        <Users className="w-3 h-3" /> {table.capacity}人
                                    </div>
                                    {table.status === 'occupied' && table.startTime && (
                                        <div className="text-xs font-mono tabular-nums text-warning font-bold">
                                            {table.startTime}
                                        </div>
                                    )}
                                    <div className={`absolute top-2 right-2 text-[10px] font-bold ${status.textColor}`}>
                                        {status.label}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Panel */}
                <div className="space-y-4">
                    {/* Table Details */}
                    <div className="card-base min-h-[280px] flex flex-col">
                        {selectedTable ? (
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                        <Armchair className="w-5 h-5 text-text-muted" />
                                        {selectedTable.number} 号桌
                                    </h2>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-xs ${statusConfig[selectedTable.status].textColor} border ${statusConfig[selectedTable.status].borderColor}`}>
                                        {statusConfig[selectedTable.status].label}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center justify-between p-3 bg-surface-sunken rounded-sm text-sm">
                                        <span className="text-text-muted">容纳人数</span>
                                        <span className="font-bold font-mono tabular-nums">{selectedTable.capacity} 人</span>
                                    </div>
                                    {selectedTable.currentOrder && (
                                        <div className="flex items-center justify-between p-3 bg-surface-sunken rounded-sm text-sm">
                                            <span className="text-text-muted">当前订单</span>
                                            <span className="font-mono font-bold text-text-primary">{selectedTable.currentOrder}</span>
                                        </div>
                                    )}
                                    {selectedTable.startTime && (
                                        <div className="flex items-center justify-between p-3 bg-surface-sunken rounded-sm text-sm">
                                            <span className="text-text-muted">开台时间</span>
                                            <span className="font-mono tabular-nums font-bold">{selectedTable.startTime}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button className="btn-action text-sm">开台</button>
                                        <button className="btn-ghost text-sm">清台</button>
                                    </div>
                                    <button
                                        onClick={handleGenerateQR}
                                        className="btn-action w-full text-sm"
                                    >
                                        <QrCode className="w-4 h-4" />
                                        生成扫码点餐二维码
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center">
                                <Armchair className="w-12 h-12 mb-3 opacity-20" />
                                <p className="text-sm">选择一张桌位查看详情</p>
                            </div>
                        )}
                    </div>

                    {/* Waitlist */}
                    <div className="card-base p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-text-primary text-sm">等位列表</h3>
                            <span className="bg-warning text-warning-fg text-xs px-1.5 py-0.5 rounded-xs font-bold font-mono">3</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                { name: '张先生', size: 4, wait: '15m' },
                                { name: 'Mike', size: 2, wait: '8m' },
                                { name: 'Lisa', size: 6, wait: '2m' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 rounded-sm bg-surface-sunken hover:bg-border transition-colors cursor-pointer">
                                    <div>
                                        <div className="font-bold text-sm text-text-primary">{item.name}</div>
                                        <div className="text-xs text-text-muted flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {item.size}人
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold font-mono tabular-nums text-warning">{item.wait}</div>
                                        <button className="text-xs text-text-secondary hover:text-text-primary mt-0.5">入座</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQRCode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface-raised rounded-md shadow-card w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-lg font-bold text-text-primary">
                                {selectedTable?.number} 号桌 · 扫码点餐
                            </h3>
                            <button
                                onClick={() => setShowQRCode(false)}
                                className="p-1.5 hover:bg-surface-sunken rounded-xs"
                            >
                                <X className="w-5 h-5 text-text-muted" />
                            </button>
                        </div>

                        <div className="bg-surface-sunken rounded-sm p-8 mb-5 flex flex-col items-center justify-center border border-border">
                            <QrCode className="w-32 h-32 text-text-primary" />
                            <p className="text-sm text-text-muted mt-3">扫描此二维码开始点餐</p>
                        </div>

                        <div className="space-y-3">
                            <button className="w-full btn-action">
                                <Download className="w-4 h-4" />
                                下载二维码
                            </button>
                            {qrCodeUrl && (
                                <p className="text-xs text-text-muted text-center font-mono break-all">{qrCodeUrl}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
