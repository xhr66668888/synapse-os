import React, { useState } from 'react';
import './Tables.css';

// 桌位数据
interface Table {
    id: string;
    number: number;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    currentOrder?: string;
    guests?: number;
    startTime?: string;
    waitTime?: string;
}

const mockTables: Table[] = [
    { id: 'T01', number: 1, capacity: 2, status: 'occupied', currentOrder: '#1925', guests: 2, startTime: '18:30' },
    { id: 'T02', number: 2, capacity: 2, status: 'available' },
    { id: 'T03', number: 3, capacity: 4, status: 'occupied', currentOrder: '#1924', guests: 3, startTime: '18:15' },
    { id: 'T04', number: 4, capacity: 4, status: 'reserved', waitTime: '19:00' },
    { id: 'T05', number: 5, capacity: 4, status: 'cleaning' },
    { id: 'T06', number: 6, capacity: 6, status: 'available' },
    { id: 'T07', number: 7, capacity: 6, status: 'occupied', currentOrder: '#1922', guests: 5, startTime: '17:45' },
    { id: 'T08', number: 8, capacity: 8, status: 'available' },
    { id: 'T09', number: 9, capacity: 4, status: 'occupied', currentOrder: '#1923', guests: 4, startTime: '18:00' },
    { id: 'T10', number: 10, capacity: 2, status: 'reserved', waitTime: '19:30' },
    { id: 'T11', number: 11, capacity: 4, status: 'available' },
    { id: 'T12', number: 12, capacity: 6, status: 'cleaning' },
];

// 等位列表
const waitlist = [
    { id: 'W001', name: '张先生', phone: '138****1234', partySize: 4, waitTime: '15 分钟', status: 'waiting' },
    { id: 'W002', name: 'Mike', phone: '139****5678', partySize: 2, waitTime: '8 分钟', status: 'waiting' },
    { id: 'W003', name: '李女士', phone: '136****9012', partySize: 6, waitTime: '3 分钟', status: 'notified' },
];

const statusLabels: Record<string, { label: string; color: string }> = {
    available: { label: '空闲', color: '#34C759' },
    occupied: { label: '用餐中', color: '#007AFF' },
    reserved: { label: '已预约', color: '#FF9500' },
    cleaning: { label: '清理中', color: '#8E8E93' },
};

export const Tables: React.FC = () => {
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);

    const tableStats = {
        total: mockTables.length,
        available: mockTables.filter(t => t.status === 'available').length,
        occupied: mockTables.filter(t => t.status === 'occupied').length,
        reserved: mockTables.filter(t => t.status === 'reserved').length,
    };

    const avgTurnover = '45 分钟';
    const todayGuests = 156;

    return (
        <div className="tables-page page">
            <header className="page-header">
                <div className="container flex-between">
                    <div>
                        <h1 className="page-title">桌位管理</h1>
                        <p className="page-subtitle">
                            空闲 <span className="highlight">{tableStats.available}</span> /
                            总共 {tableStats.total} 桌
                        </p>
                    </div>
                    <button className="btn btn-primary">
                        <span className="btn-icon">+</span>
                        添加等位
                    </button>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    {/* 统计卡片 */}
                    <div className="table-stats-grid">
                        <div className="stat-card card">
                            <div className="stat-icon available">
                                <img src="/assets/icon-pos-new.png" alt="" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div>
                                <div className="stat-value">{tableStats.available}</div>
                                <div className="stat-label">空闲桌</div>
                            </div>
                        </div>
                        <div className="stat-card card">
                            <div className="stat-icon occupied">
                                <img src="/assets/icon-menu-new.png" alt="" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div>
                                <div className="stat-value">{tableStats.occupied}</div>
                                <div className="stat-label">用餐中</div>
                            </div>
                        </div>
                        <div className="stat-card card">
                            <div className="stat-icon reserved">
                                <img src="/assets/icon-orders-new.png" alt="" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div>
                                <div className="stat-value">{tableStats.reserved}</div>
                                <div className="stat-label">已预约</div>
                            </div>
                        </div>
                        <div className="stat-card card">
                            <div className="stat-icon turnover">
                                <img src="/assets/icon-kds-new.png" alt="" style={{ width: 20, filter: 'brightness(0) invert(1)' }} />
                            </div>
                            <div>
                                <div className="stat-value">{avgTurnover}</div>
                                <div className="stat-label">平均翻台</div>
                            </div>
                        </div>
                    </div>

                    <div className="tables-layout">
                        {/* 桌位图 */}
                        <div className="floor-plan card">
                            <div className="card-header">
                                <h3>餐厅布局</h3>
                                <div className="legend">
                                    {Object.entries(statusLabels).map(([key, val]) => (
                                        <span key={key} className="legend-item">
                                            <span className="legend-dot" style={{ background: val.color }}></span>
                                            {val.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="floor-grid">
                                {mockTables.map(table => (
                                    <div
                                        key={table.id}
                                        className={`floor-table ${table.status} ${selectedTable?.id === table.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedTable(table)}
                                    >
                                        <div className="table-number">{table.number}</div>
                                        <div className="table-capacity">{table.capacity} 人</div>
                                        {table.status === 'occupied' && (
                                            <div className="table-time">{table.startTime}</div>
                                        )}
                                        {table.status === 'reserved' && (
                                            <div className="table-time">{table.waitTime}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 右侧面板 */}
                        <div className="side-panel">
                            {/* 桌位详情 */}
                            {selectedTable ? (
                                <div className="table-detail card">
                                    <div className="detail-header">
                                        <h3>桌位 {selectedTable.number}</h3>
                                        <span
                                            className="status-badge"
                                            style={{
                                                background: `${statusLabels[selectedTable.status].color}20`,
                                                color: statusLabels[selectedTable.status].color
                                            }}
                                        >
                                            {statusLabels[selectedTable.status].label}
                                        </span>
                                    </div>
                                    <div className="detail-info">
                                        <div className="info-row">
                                            <span>容量</span>
                                            <span>{selectedTable.capacity} 人</span>
                                        </div>
                                        {selectedTable.guests && (
                                            <div className="info-row">
                                                <span>当前人数</span>
                                                <span>{selectedTable.guests} 人</span>
                                            </div>
                                        )}
                                        {selectedTable.currentOrder && (
                                            <div className="info-row">
                                                <span>订单号</span>
                                                <span className="order-link">{selectedTable.currentOrder}</span>
                                            </div>
                                        )}
                                        {selectedTable.startTime && (
                                            <div className="info-row">
                                                <span>入座时间</span>
                                                <span>{selectedTable.startTime}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="detail-actions">
                                        {selectedTable.status === 'available' && (
                                            <button className="btn btn-primary btn-block">开台</button>
                                        )}
                                        {selectedTable.status === 'occupied' && (
                                            <>
                                                <button className="btn btn-primary">查看订单</button>
                                                <button className="btn btn-ghost">结账</button>
                                            </>
                                        )}
                                        {selectedTable.status === 'cleaning' && (
                                            <button className="btn btn-success btn-block">清理完成</button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="table-detail card empty">
                                    <img src="/assets/icon-pos-new.png" alt="" style={{ width: 48, opacity: 0.3 }} />
                                    <p>选择一张桌位查看详情</p>
                                </div>
                            )}

                            {/* 等位列表 */}
                            <div className="waitlist card">
                                <div className="card-header">
                                    <h3>等位列表</h3>
                                    <span className="badge">{waitlist.length}</span>
                                </div>
                                <div className="waitlist-items">
                                    {waitlist.map(w => (
                                        <div key={w.id} className="waitlist-item">
                                            <div className="waitlist-info">
                                                <span className="waitlist-name">{w.name}</span>
                                                <span className="waitlist-party">{w.partySize} 人</span>
                                            </div>
                                            <div className="waitlist-meta">
                                                <span className="waitlist-time">等待 {w.waitTime}</span>
                                                {w.status === 'notified' && (
                                                    <span className="notified-badge">已通知</span>
                                                )}
                                            </div>
                                            <button className="btn btn-sm btn-primary">入座</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tables;
