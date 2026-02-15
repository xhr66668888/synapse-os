'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface KDSOrder {
    id: string;
    orderNumber: string;
    orderType: 'dine_in' | 'takeout' | 'delivery';
    tableNumber?: string;
    status: 'pending' | 'preparing' | 'ready';
    items: { name: string; quantity: number; notes?: string; tasteModifiers?: string }[];
    createdAt: string;
}

interface UseKDSWebSocketOptions {
    restaurantId: string;
    onNewOrder?: (order: KDSOrder) => void;
    onOrderUpdate?: (order: KDSOrder) => void;
    autoReconnect?: boolean;
}

export function useKDSWebSocket(options: UseKDSWebSocketOptions) {
    const { restaurantId, onNewOrder, onOrderUpdate, autoReconnect = true } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [orders, setOrders] = useState<KDSOrder[]>([]);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
        const url = `${wsUrl}/ws/kds/${restaurantId}`;

        // 在开发模式下，如果后端未启动，使用 mock 数据
        const isDev = process.env.NODE_ENV === 'development';

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('🟢 KDS WebSocket connected');
                setIsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'initial_orders':
                            setOrders(data.orders || []);
                            break;

                        case 'new_order':
                            const newOrder = data.order as KDSOrder;
                            setOrders((prev) => [newOrder, ...prev]);
                            onNewOrder?.(newOrder);
                            // 播放提示音
                            playNotificationSound();
                            break;

                        case 'order_update':
                            const updatedOrder = data.order as KDSOrder;
                            setOrders((prev) =>
                                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                            );
                            onOrderUpdate?.(updatedOrder);
                            break;

                        case 'order_removed':
                            setOrders((prev) => prev.filter((o) => o.id !== data.orderId));
                            break;

                        default:
                            console.log('Unknown WS message type:', data.type);
                    }
                } catch (e) {
                    console.error('Failed to parse WS message:', e);
                }
            };

            ws.onerror = () => {
                // 静默处理错误，不输出到控制台（在开发模式下后端可能未启动）
                if (!isDev) {
                    console.warn('🔴 KDS WebSocket connection unavailable');
                }
                setError('WebSocket connection unavailable - using offline mode');
                setIsConnected(false);
            };

            ws.onclose = (event) => {
                if (isDev && reconnectAttempts.current === 0) {
                    // 开发模式首次关闭时静默处理
                    console.log('ℹ️ KDS WebSocket: Backend not available, using mock data');
                } else if (!isDev) {
                    console.log('🟠 KDS WebSocket closed:', event.code, event.reason);
                }
                setIsConnected(false);
                wsRef.current = null;

                // 自动重连（限制重连次数）
                if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                }
            };
        } catch (e) {
            // 静默处理连接失败
            if (!isDev) {
                console.error('Failed to create WebSocket:', e);
            }
            setError('Failed to connect - using offline mode');
        }
    }, [restaurantId, onNewOrder, onOrderUpdate, autoReconnect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsConnected(false);
    }, []);

    const updateOrderStatus = useCallback((orderId: string, status: KDSOrder['status']) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'update_status',
                orderId,
                status,
            }));
        }

        // 乐观更新
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
    }, []);

    // 初始连接
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        orders,
        error,
        updateOrderStatus,
        reconnect: connect,
        disconnect,
    };
}

// 播放通知音
function playNotificationSound() {
    if (typeof window === 'undefined') return;

    try {
        // 使用 Web Audio API 生成简单提示音
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio notification not available');
    }
}
