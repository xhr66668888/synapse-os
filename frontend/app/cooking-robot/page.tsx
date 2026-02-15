
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Bot,
    Zap,
    Timer,
    Thermometer,
    ChefHat,
    Play,
    Pause,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Send
} from 'lucide-react';
import { api, RobotStatus } from '@/lib/api';

export default function CookingRobotPage() {
    const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch Robots
    const { data: robots = [] } = useQuery({
        queryKey: ['robots'],
        queryFn: () => api.getRobots(),
        refetchInterval: 5000 // Polling every 5s
    });

    // Fetch Pending Items
    const { data: pendingOrders = [] } = useQuery({
        queryKey: ['pendingRobotItems'],
        queryFn: () => api.getPendingRobotItems('restaurant-1'), // Hardcoded restaurant ID for demo
        refetchInterval: 5000
    });

    // Push Mutation
    const pushMutation = useMutation({
        mutationFn: ({ orderItemId, robotId }: { orderItemId: string; robotId: string }) =>
            api.pushToRobot(orderItemId, robotId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['robots'] });
            queryClient.invalidateQueries({ queryKey: ['pendingRobotItems'] });
            alert('已推送指令给机器人');
        },
        onError: () => {
            alert('推送失败');
        }
    });

    const handlePush = (orderItemId: string) => {
        if (!selectedRobot) {
            alert('请先选择一个机器人');
            return;
        }
        pushMutation.mutate({ orderItemId, robotId: selectedRobot });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'cooking': return 'bg-green-500';
            case 'warming': return 'bg-yellow-500';
            case 'idle': return 'bg-gray-400';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'cooking': return '烹饪中';
            case 'warming': return '预热中';
            case 'idle': return '空闲';
            case 'error': return '故障';
            default: return '未知';
        }
    };

    // Calculate stats
    const onlineCount = robots.length;
    const cookingCount = robots.filter(r => r.status === 'cooking').length;
    const pendingCount = pendingOrders.length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Image
                        src="/panshaker-logo.png"
                        alt="Panshaker"
                        width={200}
                        height={60}
                        className="object-contain"
                    />
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">炒菜机器人控制中心</h1>
                        <p className="text-text-secondary mt-1">Panshaker Services 智能烹饪系统</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-sm text-text-secondary">系统在线</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-green-50">
                            <Bot className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{onlineCount}</div>
                            <div className="text-sm text-text-muted">在线机器人</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-50">
                            <ChefHat className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{cookingCount}</div>
                            <div className="text-sm text-text-muted">正在烹饪</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-orange-50">
                            <Timer className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{pendingCount}</div>
                            <div className="text-sm text-text-muted">待处理订单</div>
                        </div>
                    </div>
                </div>
                <div className="card p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-purple-50">
                            <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">98%</div>
                            <div className="text-sm text-text-muted">效率评分</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Robot Status */}
                <div className="col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-text-primary">机器人状态</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {robots.map((robot) => (
                            <div
                                key={robot.id}
                                className={`card p-6 cursor-pointer transition-all ${selectedRobot === robot.id ? 'ring-2 ring-primary' : ''
                                    }`}
                                onClick={() => setSelectedRobot(robot.id)}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="font-bold text-text-primary">{robot.name}</span>
                                    <span className={`w-3 h-3 rounded-full ${getStatusColor(robot.status)}`}></span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-text-muted">状态</span>
                                        <span className="font-medium">{getStatusLabel(robot.status)}</span>
                                    </div>

                                    {robot.current_dish && (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">当前菜品</span>
                                                <span className="font-medium text-primary">{robot.current_dish}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">温度</span>
                                                <span className="font-medium">{robot.temperature}°C</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-muted">剩余时间</span>
                                                <span className="font-medium">{robot.time_remaining}秒</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {robot.status === 'cooking' && (
                                    <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full animate-pulse"
                                            style={{ width: '60%' }}
                                        ></div>
                                    </div>
                                )}

                                <div className="mt-4 flex gap-2">
                                    {robot.status === 'cooking' ? (
                                        <button className="flex-1 btn btn-secondary text-xs py-2">
                                            <Pause className="w-3 h-3" /> 暂停
                                        </button>
                                    ) : (
                                        <button className="flex-1 btn btn-primary text-xs py-2">
                                            <Play className="w-3 h-3" /> 启动
                                        </button>
                                    )}
                                    <button className="btn btn-ghost text-xs py-2">
                                        <RefreshCw className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pending Orders Queue */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-primary">待推送订单</h2>
                        <span className="badge bg-orange-100 text-orange-600">{pendingOrders.length} 单</span>
                    </div>
                    <div className="card p-4 space-y-3">
                        {pendingOrders.length === 0 ? (
                            <div className="text-center text-text-muted py-8">
                                暂无待处理订单
                            </div>
                        ) : (
                            pendingOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary/50 hover:bg-bg-hover transition-colors"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-text-primary">{order.order_number}</span>
                                            <span className="text-xs text-text-muted">x{order.quantity}</span>
                                        </div>
                                        <div className="text-sm text-text-secondary">{order.dish_name}</div>
                                        <div className="text-xs text-text-muted mt-1">预计 {order.wait_time}</div>
                                    </div>
                                    <button
                                        className="btn btn-primary text-xs py-2 px-3"
                                        onClick={() => handlePush(order.id)}
                                        disabled={pushMutation.isPending}
                                    >
                                        <Send className="w-3 h-3" />
                                        {pushMutation.isPending ? '推送中...' : '推送'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {!selectedRobot && (
                        <div className="alert bg-blue-50 text-blue-800 text-sm">
                            <AlertCircle className="w-4 h-4 inline mr-2" />
                            请从左侧选择一个机器人以推送订单
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
