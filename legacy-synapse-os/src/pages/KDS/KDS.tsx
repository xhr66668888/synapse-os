import React, { useState, useEffect } from 'react';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import './KDS.css';

// 模拟订单数据
interface KDSOrder {
    id: string;
    orderNumber: string;
    orderType: 'dine_in' | 'takeout' | 'delivery';
    tableNumber?: string;
    status: 'pending' | 'preparing' | 'ready';
    items: { name: string; quantity: number; notes?: string; tasteModifiers?: string }[];
    createdAt: Date;
    robotStatus?: 'queued' | 'cooking' | 'done';
}

const mockOrders: KDSOrder[] = [
    {
        id: '1',
        orderNumber: '#1025',
        orderType: 'dine_in',
        tableNumber: '12',
        status: 'pending',
        items: [
            { name: '宫保鸡丁', quantity: 2, tasteModifiers: '少盐' },
            { name: '蛋炒饭', quantity: 1 },
        ],
        createdAt: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
        id: '2',
        orderNumber: '#1024',
        orderType: 'takeout',
        status: 'preparing',
        items: [
            { name: '麻婆豆腐', quantity: 1, tasteModifiers: '微辣' },
            { name: '红烧肉', quantity: 1 },
        ],
        createdAt: new Date(Date.now() - 5 * 60 * 1000),
        robotStatus: 'cooking',
    },
    {
        id: '3',
        orderNumber: '#1023',
        orderType: 'delivery',
        status: 'ready',
        items: [
            { name: '糖醋排骨', quantity: 1 },
            { name: '扬州炒饭', quantity: 2 },
        ],
        createdAt: new Date(Date.now() - 8 * 60 * 1000),
        robotStatus: 'done',
    },
];

// 计算等待时间
const getWaitTime = (createdAt: Date): string => {
    const minutes = Math.floor((Date.now() - createdAt.getTime()) / 60000);
    if (minutes < 1) return '刚刚';
    return `${minutes} 分钟`;
};

export const KDS: React.FC = () => {
    const [orders, setOrders] = useState<KDSOrder[]>(mockOrders);
    const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
    const hasRobotControl = useFeatureFlag('robotControl');

    // 模拟实时更新
    useEffect(() => {
        const interval = setInterval(() => {
            setOrders(prev => [...prev]); // 触发重渲染以更新时间
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const updateOrderStatus = (orderId: string, newStatus: KDSOrder['status']) => {
        setOrders(prev =>
            prev.map(order =>
                order.id === orderId
                    ? { ...order, status: newStatus, robotStatus: newStatus === 'preparing' ? 'cooking' : order.robotStatus }
                    : order
            )
        );
    };

    const sendToRobot = (orderId: string) => {
        // 模拟发送到机器人
        setOrders(prev =>
            prev.map(order =>
                order.id === orderId
                    ? { ...order, status: 'preparing', robotStatus: 'queued' }
                    : order
            )
        );

        // 模拟机器人开始烹饪
        setTimeout(() => {
            setOrders(prev =>
                prev.map(order =>
                    order.id === orderId
                        ? { ...order, robotStatus: 'cooking' }
                        : order
                )
            );
        }, 2000);

        console.log('📤 Robot Command:', {
            orderId,
            command: 'START_COOKING',
            timestamp: new Date().toISOString(),
        });
    };

    const filteredOrders = orders.filter(order =>
        filter === 'all' || order.status === filter
    );

    const getStatusColumns = () => {
        return {
            pending: filteredOrders.filter(o => o.status === 'pending'),
            preparing: filteredOrders.filter(o => o.status === 'preparing'),
            ready: filteredOrders.filter(o => o.status === 'ready'),
        };
    };

    const columns = getStatusColumns();

    return (
        <div className="kds-page">
            {/* 顶部栏 */}
            <div className="kds-header">
                <div className="kds-title">
                    <h1>👨‍🍳 厨房显示系统</h1>
                    <span className="kds-time">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="kds-filters">
                    {(['all', 'pending', 'preparing', 'ready'] as const).map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' && '全部'}
                            {f === 'pending' && '🟡 待处理'}
                            {f === 'preparing' && '🔵 制作中'}
                            {f === 'ready' && '🟢 已完成'}
                            <span className="filter-count">
                                {f === 'all' ? orders.length : orders.filter(o => o.status === f).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 订单看板 */}
            <div className="kds-board">
                {/* 待处理列 */}
                <div className="kds-column pending">
                    <div className="column-header">
                        <h2>🟡 待处理</h2>
                        <span className="column-count">{columns.pending.length}</span>
                    </div>
                    <div className="column-content">
                        {columns.pending.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                showRobot={hasRobotControl}
                                onStatusChange={updateOrderStatus}
                                onSendToRobot={sendToRobot}
                            />
                        ))}
                    </div>
                </div>

                {/* 制作中列 */}
                <div className="kds-column preparing">
                    <div className="column-header">
                        <h2>🔵 制作中</h2>
                        <span className="column-count">{columns.preparing.length}</span>
                    </div>
                    <div className="column-content">
                        {columns.preparing.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                showRobot={hasRobotControl}
                                onStatusChange={updateOrderStatus}
                                onSendToRobot={sendToRobot}
                            />
                        ))}
                    </div>
                </div>

                {/* 已完成列 */}
                <div className="kds-column ready">
                    <div className="column-header">
                        <h2>🟢 已完成</h2>
                        <span className="column-count">{columns.ready.length}</span>
                    </div>
                    <div className="column-content">
                        {columns.ready.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                showRobot={hasRobotControl}
                                onStatusChange={updateOrderStatus}
                                onSendToRobot={sendToRobot}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 订单卡片组件
interface OrderCardProps {
    order: KDSOrder;
    showRobot: boolean;
    onStatusChange: (orderId: string, status: KDSOrder['status']) => void;
    onSendToRobot: (orderId: string) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, showRobot, onStatusChange, onSendToRobot }) => {
    const waitTime = getWaitTime(order.createdAt);
    const isUrgent = (Date.now() - order.createdAt.getTime()) > 10 * 60 * 1000;

    return (
        <div className={`order-card ${order.status} ${isUrgent && order.status !== 'ready' ? 'urgent' : ''}`}>
            <div className="order-card-header">
                <div className="order-number">{order.orderNumber}</div>
                <div className="order-meta">
                    <span className={`order-type type-${order.orderType}`}>
                        {order.orderType === 'dine_in' && `🍽️ ${order.tableNumber}号桌`}
                        {order.orderType === 'takeout' && '🥡 外带'}
                        {order.orderType === 'delivery' && '🛵 外卖'}
                    </span>
                    <span className={`wait-time ${isUrgent ? 'urgent' : ''}`}>
                        ⏱️ {waitTime}
                    </span>
                </div>
            </div>

            <div className="order-items">
                {order.items.map((item, idx) => (
                    <div key={idx} className="kds-item">
                        <span className="item-qty">{item.quantity}x</span>
                        <span className="item-name">{item.name}</span>
                        {item.tasteModifiers && (
                            <span className="item-modifier">🎛️ {item.tasteModifiers}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* 机器人状态 */}
            {showRobot && order.robotStatus && (
                <div className={`robot-status robot-${order.robotStatus}`}>
                    {order.robotStatus === 'queued' && '🤖 排队中...'}
                    {order.robotStatus === 'cooking' && '🤖 机器人烹饪中...'}
                    {order.robotStatus === 'done' && '🤖 机器人完成'}
                </div>
            )}

            <div className="order-actions">
                {order.status === 'pending' && (
                    <>
                        {showRobot && (
                            <button className="btn btn-primary btn-sm" onClick={() => onSendToRobot(order.id)}>
                                🤖 推送机器人
                            </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange(order.id, 'preparing')}>
                            开始制作
                        </button>
                    </>
                )}
                {order.status === 'preparing' && (
                    <button className="btn btn-success btn-sm" onClick={() => onStatusChange(order.id, 'ready')}>
                        ✓ 完成
                    </button>
                )}
                {order.status === 'ready' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => onStatusChange(order.id, 'pending')}>
                        重新制作
                    </button>
                )}
            </div>
        </div>
    );
};

export default KDS;
