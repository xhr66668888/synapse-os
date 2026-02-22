'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { audioManager } from '@/lib/audio';

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
        const isDev = process.env.NODE_ENV === 'development';

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('KDS WebSocket connected');
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

                        case 'new_order': {
                            const newOrder = data.order as KDSOrder;
                            setOrders((prev) => [newOrder, ...prev]);
                            onNewOrder?.(newOrder);
                            audioManager.playNewOrder();
                            break;
                        }

                        case 'order_update': {
                            const updatedOrder = data.order as KDSOrder;
                            setOrders((prev) =>
                                prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
                            );
                            onOrderUpdate?.(updatedOrder);
                            break;
                        }

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
                if (!isDev) {
                    console.warn('KDS WebSocket connection unavailable');
                }
                setError('WebSocket connection unavailable - using offline mode');
                setIsConnected(false);
            };

            ws.onclose = (event) => {
                if (isDev && reconnectAttempts.current === 0) {
                    console.log('KDS WebSocket: Backend not available, using mock data');
                } else if (!isDev) {
                    console.log('KDS WebSocket closed:', event.code, event.reason);
                }
                setIsConnected(false);
                wsRef.current = null;

                if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                }
            };
        } catch (e) {
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
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status } : o))
        );
    }, []);

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
