'use client';

import { useState, useEffect } from 'react';
import { ChefHat, Clock, Check, Play, Pause, Bell, Bot, Users, RefreshCw, AlertCircle } from 'lucide-react';

interface ExpoItem {
  itemId: string;
  menuItemName: string;
  quantity: number;
  seatNumber?: number;
  status: 'pending' | 'cooking' | 'ready' | 'served';
  isRobot: boolean;
  prepTime: number;
  firedAt?: string;
}

interface ExpoOrder {
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  currentCourse: number;
  totalCourses: number;
  items: ExpoItem[];
  allReady: boolean;
}

export default function ExpoPage() {
  const [orders, setOrders] = useState<ExpoOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  useEffect(() => {
    // Mock data - 实际项目会从 WebSocket 或 API 获取实时数据
    setOrders([
      {
        orderId: '1',
        orderNumber: '#1925',
        tableNumber: '5',
        currentCourse: 1,
        totalCourses: 2,
        items: [
          { itemId: 'i1', menuItemName: '宫保鸡丁', quantity: 1, status: 'cooking', isRobot: true, prepTime: 8 },
          { itemId: 'i2', menuItemName: '青椒牛柳', quantity: 1, status: 'ready', isRobot: true, prepTime: 10 },
          { itemId: 'i3', menuItemName: '蔬菜沙拉', quantity: 2, status: 'ready', isRobot: false, prepTime: 3 },
        ],
        allReady: false,
      },
      {
        orderId: '2',
        orderNumber: '#1926',
        tableNumber: '3',
        currentCourse: 1,
        totalCourses: 1,
        items: [
          { itemId: 'i4', menuItemName: '红烧排骨', quantity: 1, status: 'cooking', isRobot: true, prepTime: 15 },
          { itemId: 'i5', menuItemName: '糖醋里脊', quantity: 1, status: 'pending', isRobot: true, prepTime: 12 },
        ],
        allReady: false,
      },
      {
        orderId: '3',
        orderNumber: '#1924',
        tableNumber: '8',
        currentCourse: 1,
        totalCourses: 1,
        items: [
          { itemId: 'i6', menuItemName: '麻婆豆腐', quantity: 1, status: 'ready', isRobot: true, prepTime: 6 },
          { itemId: 'i7', menuItemName: '番茄炒蛋', quantity: 1, status: 'ready', isRobot: false, prepTime: 5 },
          { itemId: 'i8', menuItemName: '白米饭', quantity: 3, status: 'ready', isRobot: false, prepTime: 0 },
        ],
        allReady: true,
      },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-600';
      case 'cooking': return 'bg-yellow-100 text-yellow-700';
      case 'ready': return 'bg-green-100 text-green-700';
      case 'served': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待';
      case 'cooking': return '制作中';
      case 'ready': return '已完成';
      case 'served': return '已上桌';
      default: return status;
    }
  };

  const markItemReady = (orderId: string, itemId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.orderId === orderId) {
        const newItems = order.items.map(item =>
          item.itemId === itemId ? { ...item, status: 'ready' as const } : item
        );
        return {
          ...order,
          items: newItems,
          allReady: newItems.every(i => i.status === 'ready'),
        };
      }
      return order;
    }));
  };

  const markOrderServed = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.orderId === orderId) {
        return {
          ...order,
          items: order.items.map(item => ({ ...item, status: 'served' as const })),
        };
      }
      return order;
    }));
  };

  const readyOrders = orders.filter(o => o.allReady && o.items.some(i => i.status !== 'served'));
  const inProgressOrders = orders.filter(o => !o.allReady);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Expo 出餐协调</h1>
          <p className="text-text-secondary">统一协调机器人与厨师出餐，确保同桌菜品同时上桌</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-medium text-green-700">实时同步中</span>
          </div>
          <button className="btn btn-secondary">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-50">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{inProgressOrders.length}</div>
              <div className="text-xs text-text-muted">制作中</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">{readyOrders.length}</div>
              <div className="text-xs text-text-muted">待上桌</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {orders.flatMap(o => o.items).filter(i => i.isRobot && i.status === 'cooking').length}
              </div>
              <div className="text-xs text-text-muted">机器人制作</div>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50">
              <ChefHat className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-text-primary">
                {orders.flatMap(o => o.items).filter(i => !i.isRobot && i.status === 'cooking').length}
              </div>
              <div className="text-xs text-text-muted">厨师制作</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ready to Serve */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Bell className="w-5 h-5 text-green-500" />
            待上桌
            {readyOrders.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">{readyOrders.length}</span>
            )}
          </h2>
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="card p-12 text-center">
                <Check className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-text-muted">暂无待上桌订单</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="card p-5 border-2 border-green-200 bg-green-50/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-text-primary">{order.orderNumber}</span>
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        桌 {order.tableNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => markOrderServed(order.orderId)}
                      className="btn btn-primary"
                    >
                      <Check className="w-4 h-4" />
                      确认上桌
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {order.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center gap-2 p-3 rounded-xl bg-white border border-border"
                      >
                        {item.isRobot ? (
                          <Bot className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        ) : (
                          <ChefHat className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-text-primary truncate">{item.menuItemName}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-text-muted flex-shrink-0">x{item.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* In Progress */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            制作中
            {inProgressOrders.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">{inProgressOrders.length}</span>
            )}
          </h2>
          <div className="space-y-4">
            {inProgressOrders.length === 0 ? (
              <div className="card p-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-text-muted">暂无制作中订单</p>
              </div>
            ) : (
              inProgressOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="card p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-text-primary">{order.orderNumber}</span>
                      <span className="px-3 py-1 rounded-full bg-bg-secondary text-text-secondary">
                        桌 {order.tableNumber}
                      </span>
                    </div>
                    <div className="text-sm text-text-muted">
                      课程 {order.currentCourse}/{order.totalCourses}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary"
                      >
                        <div className="flex items-center gap-3">
                          {item.isRobot ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                              <ChefHat className="w-4 h-4 text-orange-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-text-primary">{item.menuItemName}</div>
                            <div className="text-xs text-text-muted">
                              {item.quantity > 1 && `x${item.quantity} · `}
                              预计 {item.prepTime} 分钟
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                          {item.status === 'cooking' && (
                            <button
                              onClick={() => markItemReady(order.orderId, item.itemId)}
                              className="p-2 rounded-lg bg-green-100 hover:bg-green-200 transition-colors"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>进度</span>
                      <span>
                        {order.items.filter(i => i.status === 'ready').length}/{order.items.length} 完成
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 to-green-500 transition-all duration-500"
                        style={{
                          width: `${(order.items.filter(i => i.status === 'ready').length / order.items.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
