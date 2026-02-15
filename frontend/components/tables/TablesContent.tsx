'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, Table as TableType } from '@/lib/api';
import {
    Users,
    MapPin,
    Clock,
    MoreHorizontal,
    Plus,
    Armchair,
    UtensilsCrossed,
    Ban,
    Timer,
    QrCode,
    Download
} from 'lucide-react';

// Mock Sky
interface TableData {
    id: string;
    number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    currentOrder?: string;
    guests?: number;
    startTime?: string;
    waitTime?: string;
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

const statusConfig: Record<string, { label: string; bg: string; border: string; text: string; icon: any }> = {
    available: { label: '空闲中', bg: 'bg-white', border: 'border-green-400', text: 'text-green-600', icon: CheckIcon },
    occupied: { label: '用餐中', bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-600', icon: UtensilsCrossed },
    reserved: { label: '已预订', bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-600', icon: Clock },
    cleaning: { label: '清理中', bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-500', icon: Ban },
};

function CheckIcon(props: any) {
    return <div className="w-2 h-2 rounded-full bg-green-500" {...props} />
}

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
            const response = await fetch(`/api/v1/tables/${selectedTable.id}/generate-qr`, {
                method: 'POST'
            });
            const data = await response.json();
            setQrCodeUrl(`${window.location.origin}${data.qr_url}`);
            setShowQRCode(true);
        } catch (error) {
            console.error('生成QR码失败:', error);
            alert('生成QR码失败');
        }
    };

    const downloadQRCode = () => {
        // 使用第三方库或canvas生成QR码图片
        // 这里简化处理，实际项目中应该使用qrcode库
        const qrText = qrCodeUrl;
        alert(`QR码内容: ${qrText}\n\n实际项目中这里会下载QR码图片`);
    };

    return (
        <div className="min-h-screen bg-bg-secondary p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">桌位管理</h1>
                    <p className="text-sm text-text-muted mt-1">
                        空闲 <span className="text-success font-bold">{stats.available}</span> / 总共 {stats.total} 桌
                    </p>
                </div>
                <button className="btn btn-primary shadow-lg shadow-primary/20">
                    <Plus className="w-4 h-4 mr-1" /> 添加等位
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard label="空闲桌" value={stats.available} color="text-green-600" bg="bg-green-100" />
                <StatCard label="用餐中" value={stats.occupied} color="text-blue-600" bg="bg-blue-100" />
                <StatCard label="已预订" value={stats.reserved} color="text-orange-600" bg="bg-orange-100" />
                <div className="card p-4 flex items-center justify-between">
                    <div>
                        <div className="text-text-muted text-xs font-medium uppercase tracking-wider">平均翻台</div>
                        <div className="text-2xl font-bold mt-1 text-text-primary">45m</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Timer className="w-5 h-5 text-gray-500" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Floor Plan */}
                <div className="lg:col-span-2 card p-8 min-h-[600px] relative">
                    <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" /> 餐厅布局
                    </h2>

                    <div className="grid grid-cols-4 gap-6">
                        {tables.map((table) => {
                            const status = statusConfig[table.status];
                            const StatusIcon = status.icon;
                            const isSelected = selectedTable?.id === table.id;

                            return (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table)}
                                    className={`relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center min-h-[140px] group ${isSelected ? 'ring-4 ring-primary/20 scale-105 z-10' : ''
                                        } ${status.bg} ${status.border} hover:shadow-lg`}
                                >
                                    <div className="text-2xl font-bold text-text-primary mb-1">{table.number}</div>
                                    <div className="flex items-center gap-1 text-xs text-text-secondary mb-2">
                                        <Users className="w-3 h-3" /> {table.capacity}人
                                    </div>

                                    {table.status === 'occupied' && (
                                        <div className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mb-1">
                                            {table.startTime}
                                        </div>
                                    )}

                                    <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${table.status === 'available' ? 'bg-green-500' :
                                            table.status === 'occupied' ? 'bg-blue-500' :
                                                table.status === 'reserved' ? 'bg-orange-500' : 'bg-gray-400'
                                        }`} />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Panel */}
                <div className="space-y-6">
                    {/* Table Details */}
                    <div className="card min-h-[300px] flex flex-col">
                        {selectedTable ? (
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                        <Armchair className="w-6 h-6 text-primary" />
                                        {selectedTable.number} 号桌
                                    </h2>
                                    <button onClick={() => setSelectedTable(null)} className="text-text-muted hover:text-text-primary">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div className="p-4 rounded-xl bg-bg-secondary flex items-center justify-between">
                                        <span className="text-sm text-text-secondary">状态</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig[selectedTable.status].text.replace('text-', 'bg-').replace('600', '100')
                                            } ${statusConfig[selectedTable.status].text}`}>
                                            {statusConfig[selectedTable.status].label}
                                        </span>
                                    </div>

                                    {selectedTable.currentOrder && (
                                        <div className="p-4 rounded-xl bg-bg-secondary flex justify-between items-center">
                                            <span className="text-sm text-text-secondary">当前订单</span>
                                            <span className="font-mono font-bold text-primary">{selectedTable.currentOrder}</span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="btn btn-primary w-full">开台</button>
                                        <button className="btn btn-secondary w-full">清台</button>
                                    </div>
                                    
                                    <button 
                                        onClick={handleGenerateQR}
                                        className="btn w-full mt-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                                    >
                                        <QrCode className="w-4 h-4 mr-2" />
                                        生成扫码点餐二维码
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-muted p-8 text-center">
                                <Armchair className="w-16 h-16 mb-4 opacity-20" />
                                <p>选择一张桌位查看详情</p>
                            </div>
                        )}
                    </div>

                    {/* Waitlist (Mini) */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-text-primary">等位列表</h3>
                            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">3</span>
                        </div>
                        <div className="space-y-3">
                            {[
                                { name: '张先生', size: 4, wait: '15m' },
                                { name: 'Mike', size: 2, wait: '8m' },
                                { name: 'Lisa', size: 6, wait: '2m' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary hover:bg-bg-hover transition-colors cursor-pointer">
                                    <div>
                                        <div className="font-medium text-text-primary">{item.name}</div>
                                        <div className="text-xs text-text-muted flex items-center gap-1">
                                            <Users className="w-3 h-3" /> {item.size}人
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-primary">{item.wait}</div>
                                        <button className="text-xs text-text-secondary hover:text-primary mt-1">入座</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* QR码弹窗 */}
            {showQRCode && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">桌位 {selectedTable?.number} 扫码点餐</h3>
                            <button 
                                onClick={() => setShowQRCode(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="bg-white p-6 rounded-xl border-2 border-gray-200 mb-6">
                            {/* 这里应该显示实际的QR码图片 */}
                            <div className="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <QrCode className="w-32 h-32 text-blue-600 mx-auto mb-4" />
                                    <p className="text-sm text-gray-600">扫描此二维码开始点餐</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={downloadQRCode}
                                className="w-full btn btn-primary flex items-center justify-center"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                下载二维码
                            </button>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 break-all">{qrCodeUrl}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
    return (
        <div className="card p-4 flex items-center justify-between">
            <div>
                <div className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</div>
                <div className="text-2xl font-bold mt-1 text-text-primary">{value}</div>
            </div>
            <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center`}>
                <div className={`w-3 h-3 rounded-full ${color.replace('text-', 'bg-')}`} />
            </div>
        </div>
    );
}
