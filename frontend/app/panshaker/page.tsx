'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
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
    Send,
    Droplets,
    Flame,
    Package,
    Settings2,
    Sparkles,
    AlertTriangle,
    Gauge,
    CircleDot,
    Utensils,
    User,
    Heart,
    Leaf,
    Circle,
    Clock,
    TrendingUp,
    Activity,
    Power,
    RotateCcw,
    Trash2,
    Plus,
    Check,
    X
} from 'lucide-react';

// 机器人状态类型
type RobotStatus = 'idle' | 'preheating' | 'cooking' | 'cleaning' | 'error' | 'maintenance';

// 料仓类型
interface Hopper {
    id: string;
    name: string;
    type: 'oil' | 'sauce' | 'spice' | 'liquid';
    currentLevel: number; // 0-100
    maxCapacity: number; // ml or g
    unit: string;
    lowThreshold: number;
}

// 机器人详情
interface Robot {
    id: string;
    name: string;
    model: string;
    status: RobotStatus;
    temperature: number;
    targetTemperature: number;
    currentDish: string | null;
    currentOrderId: string | null;
    progress: number; // 0-100
    timeRemaining: number; // seconds
    totalTime: number;
    cleanStatus: 'clean' | 'needs_rinse' | 'needs_deep_clean';
    lastCleanTime: string;
    hoppers: Hopper[];
    todayDishes: number;
    uptime: number; // hours
    efficiency: number; // percentage
}

// 待炒订单
interface PendingOrder {
    id: string;
    orderNumber: string;
    dishName: string;
    quantity: number;
    tableNumber: string;
    waitTime: string;
    priority: 'normal' | 'rush' | 'vip';
    customerPreferences: {
        saltLevel: 'light' | 'normal' | 'heavy';
        oilLevel: 'light' | 'normal' | 'heavy';
        spiceLevel: 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
        notes: string;
    } | null;
    estimatedCookTime: number;
}

// Mock 数据
const mockRobots: Robot[] = [
    {
        id: 'robot-1',
        name: 'PanShaker #1',
        model: 'PS-3000 Pro',
        status: 'cooking',
        temperature: 180,
        targetTemperature: 200,
        currentDish: '宫保鸡丁',
        currentOrderId: 'ORD-001',
        progress: 65,
        timeRemaining: 120,
        totalTime: 340,
        cleanStatus: 'clean',
        lastCleanTime: '10:30',
        hoppers: [
            { id: 'h1', name: '食用油', type: 'oil', currentLevel: 75, maxCapacity: 2000, unit: 'ml', lowThreshold: 20 },
            { id: 'h2', name: '酱油', type: 'sauce', currentLevel: 60, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h3', name: '料酒', type: 'liquid', currentLevel: 45, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h4', name: '盐', type: 'spice', currentLevel: 80, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h5', name: '糖', type: 'spice', currentLevel: 55, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h6', name: '花椒粉', type: 'spice', currentLevel: 30, maxCapacity: 200, unit: 'g', lowThreshold: 25 },
        ],
        todayDishes: 47,
        uptime: 6.5,
        efficiency: 94
    },
    {
        id: 'robot-2',
        name: 'PanShaker #2',
        model: 'PS-3000 Pro',
        status: 'idle',
        temperature: 25,
        targetTemperature: 0,
        currentDish: null,
        currentOrderId: null,
        progress: 0,
        timeRemaining: 0,
        totalTime: 0,
        cleanStatus: 'needs_rinse',
        lastCleanTime: '09:45',
        hoppers: [
            { id: 'h1', name: '食用油', type: 'oil', currentLevel: 40, maxCapacity: 2000, unit: 'ml', lowThreshold: 20 },
            { id: 'h2', name: '酱油', type: 'sauce', currentLevel: 85, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h3', name: '料酒', type: 'liquid', currentLevel: 70, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h4', name: '盐', type: 'spice', currentLevel: 65, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h5', name: '糖', type: 'spice', currentLevel: 90, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h6', name: '辣椒粉', type: 'spice', currentLevel: 15, maxCapacity: 200, unit: 'g', lowThreshold: 25 },
        ],
        todayDishes: 38,
        uptime: 5.2,
        efficiency: 91
    },
    {
        id: 'robot-3',
        name: 'PanShaker #3',
        model: 'PS-2000',
        status: 'preheating',
        temperature: 120,
        targetTemperature: 180,
        currentDish: '番茄炒蛋',
        currentOrderId: 'ORD-003',
        progress: 0,
        timeRemaining: 180,
        totalTime: 180,
        cleanStatus: 'clean',
        lastCleanTime: '11:00',
        hoppers: [
            { id: 'h1', name: '食用油', type: 'oil', currentLevel: 90, maxCapacity: 2000, unit: 'ml', lowThreshold: 20 },
            { id: 'h2', name: '酱油', type: 'sauce', currentLevel: 50, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h3', name: '料酒', type: 'liquid', currentLevel: 60, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h4', name: '盐', type: 'spice', currentLevel: 70, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h5', name: '糖', type: 'spice', currentLevel: 45, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h6', name: '白胡椒', type: 'spice', currentLevel: 55, maxCapacity: 200, unit: 'g', lowThreshold: 25 },
        ],
        todayDishes: 29,
        uptime: 4.0,
        efficiency: 88
    },
    {
        id: 'robot-4',
        name: 'PanShaker #4',
        model: 'PS-3000 Pro',
        status: 'cleaning',
        temperature: 60,
        targetTemperature: 0,
        currentDish: null,
        currentOrderId: null,
        progress: 40,
        timeRemaining: 90,
        totalTime: 150,
        cleanStatus: 'needs_deep_clean',
        lastCleanTime: '08:00',
        hoppers: [
            { id: 'h1', name: '食用油', type: 'oil', currentLevel: 25, maxCapacity: 2000, unit: 'ml', lowThreshold: 20 },
            { id: 'h2', name: '酱油', type: 'sauce', currentLevel: 35, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h3', name: '料酒', type: 'liquid', currentLevel: 40, maxCapacity: 1000, unit: 'ml', lowThreshold: 15 },
            { id: 'h4', name: '盐', type: 'spice', currentLevel: 50, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h5', name: '糖', type: 'spice', currentLevel: 60, maxCapacity: 500, unit: 'g', lowThreshold: 20 },
            { id: 'h6', name: '五香粉', type: 'spice', currentLevel: 80, maxCapacity: 200, unit: 'g', lowThreshold: 25 },
        ],
        todayDishes: 52,
        uptime: 7.0,
        efficiency: 96
    },
];

const mockPendingOrders: PendingOrder[] = [
    {
        id: 'pending-1',
        orderNumber: '#1024',
        dishName: '鱼香肉丝',
        quantity: 1,
        tableNumber: 'A3',
        waitTime: '2分钟',
        priority: 'normal',
        customerPreferences: {
            saltLevel: 'light',
            oilLevel: 'light',
            spiceLevel: 'medium',
            notes: '不要木耳'
        },
        estimatedCookTime: 240
    },
    {
        id: 'pending-2',
        orderNumber: '#1025',
        dishName: '麻婆豆腐',
        quantity: 2,
        tableNumber: 'B1',
        waitTime: '5分钟',
        priority: 'rush',
        customerPreferences: {
            saltLevel: 'normal',
            oilLevel: 'normal',
            spiceLevel: 'extra_hot',
            notes: '多放花椒'
        },
        estimatedCookTime: 180
    },
    {
        id: 'pending-3',
        orderNumber: '#1026',
        dishName: '青椒肉丝',
        quantity: 1,
        tableNumber: 'A5',
        waitTime: '8分钟',
        priority: 'vip',
        customerPreferences: null,
        estimatedCookTime: 200
    },
    {
        id: 'pending-4',
        orderNumber: '#1027',
        dishName: '干煸四季豆',
        quantity: 1,
        tableNumber: 'C2',
        waitTime: '3分钟',
        priority: 'normal',
        customerPreferences: {
            saltLevel: 'normal',
            oilLevel: 'heavy',
            spiceLevel: 'mild',
            notes: ''
        },
        estimatedCookTime: 300
    },
    {
        id: 'pending-5',
        orderNumber: '#1028',
        dishName: '蒜蓉西兰花',
        quantity: 1,
        tableNumber: 'B3',
        waitTime: '1分钟',
        priority: 'normal',
        customerPreferences: {
            saltLevel: 'light',
            oilLevel: 'light',
            spiceLevel: 'none',
            notes: '清淡口味'
        },
        estimatedCookTime: 150
    },
];

export default function PanShakerPage() {
    const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'hoppers' | 'clean' | 'customize'>('status');
    const [robots, setRobots] = useState<Robot[]>(mockRobots);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(mockPendingOrders);

    // 模拟实时更新
    useEffect(() => {
        const interval = setInterval(() => {
            setRobots(prev => prev.map(robot => {
                if (robot.status === 'cooking' && robot.timeRemaining > 0) {
                    const newTimeRemaining = robot.timeRemaining - 1;
                    const newProgress = Math.round(((robot.totalTime - newTimeRemaining) / robot.totalTime) * 100);
                    return {
                        ...robot,
                        timeRemaining: newTimeRemaining,
                        progress: newProgress,
                        temperature: Math.min(robot.temperature + 0.5, robot.targetTemperature)
                    };
                }
                if (robot.status === 'preheating') {
                    const newTemp = Math.min(robot.temperature + 2, robot.targetTemperature);
                    if (newTemp >= robot.targetTemperature) {
                        return { ...robot, temperature: newTemp, status: 'cooking' as RobotStatus };
                    }
                    return { ...robot, temperature: newTemp };
                }
                if (robot.status === 'cleaning' && robot.timeRemaining > 0) {
                    const newTimeRemaining = robot.timeRemaining - 1;
                    const newProgress = Math.round(((robot.totalTime - newTimeRemaining) / robot.totalTime) * 100);
                    return { ...robot, timeRemaining: newTimeRemaining, progress: newProgress };
                }
                return robot;
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: RobotStatus) => {
        switch (status) {
            case 'cooking': return 'bg-green-500';
            case 'preheating': return 'bg-yellow-500';
            case 'idle': return 'bg-gray-400';
            case 'cleaning': return 'bg-blue-500';
            case 'error': return 'bg-red-500';
            case 'maintenance': return 'bg-purple-500';
            default: return 'bg-gray-400';
        }
    };

    const getStatusLabel = (status: RobotStatus) => {
        switch (status) {
            case 'cooking': return '烹饪中';
            case 'preheating': return '预热中';
            case 'idle': return '空闲';
            case 'cleaning': return '清洁中';
            case 'error': return '故障';
            case 'maintenance': return '维护中';
            default: return '未知';
        }
    };

    const getCleanStatusBadge = (status: string) => {
        switch (status) {
            case 'clean': return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">干净</span>;
            case 'needs_rinse': return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">需冲洗</span>;
            case 'needs_deep_clean': return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">需深度清洁</span>;
            default: return null;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'rush': return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">加急</span>;
            case 'vip': return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">VIP</span>;
            default: return null;
        }
    };

    const getSpiceLevelLabel = (level: string) => {
        switch (level) {
            case 'none': return '不辣';
            case 'mild': return '微辣';
            case 'medium': return '中辣';
            case 'hot': return '重辣';
            case 'extra_hot': return '特辣';
            default: return level;
        }
    };

    const getLevelLabel = (level: string) => {
        switch (level) {
            case 'light': return '少';
            case 'normal': return '正常';
            case 'heavy': return '多';
            default: return level;
        }
    };

    const handlePushToRobot = (orderId: string, robotId: string) => {
        // 模拟推送
        setPendingOrders(prev => prev.filter(o => o.id !== orderId));
        alert(`订单已推送到 ${robots.find(r => r.id === robotId)?.name}`);
    };

    const handleStartClean = (robotId: string, cleanType: 'rinse' | 'deep') => {
        setRobots(prev => prev.map(robot => {
            if (robot.id === robotId) {
                return {
                    ...robot,
                    status: 'cleaning' as RobotStatus,
                    currentDish: null,
                    progress: 0,
                    timeRemaining: cleanType === 'rinse' ? 60 : 180,
                    totalTime: cleanType === 'rinse' ? 60 : 180
                };
            }
            return robot;
        }));
    };

    const handleRefillHopper = (robotId: string, hopperId: string) => {
        setRobots(prev => prev.map(robot => {
            if (robot.id === robotId) {
                return {
                    ...robot,
                    hoppers: robot.hoppers.map(h => 
                        h.id === hopperId ? { ...h, currentLevel: 100 } : h
                    )
                };
            }
            return robot;
        }));
    };

    // 统计数据
    const stats = {
        online: robots.length,
        cooking: robots.filter(r => r.status === 'cooking').length,
        pending: pendingOrders.length,
        todayTotal: robots.reduce((sum, r) => sum + r.todayDishes, 0),
        avgEfficiency: Math.round(robots.reduce((sum, r) => sum + r.efficiency, 0) / robots.length)
    };

    const selectedRobotData = robots.find(r => r.id === selectedRobot);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Image
                        src="/panshaker-logo.png"
                        alt="PanShaker"
                        width={180}
                        height={60}
                        className="object-contain"
                    />
                    <div className="border-l border-border pl-4">
                        <h1 className="text-2xl font-bold text-text-primary">PanShaker Services</h1>
                        <p className="text-text-secondary">智能炒菜机器人控制中心</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border border-green-200">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-sm font-medium text-green-700">系统正常运行</span>
                    </div>
                    <button className="btn btn-secondary">
                        <Settings2 className="w-4 h-4" />
                        系统设置
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50">
                            <Bot className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.online}</div>
                            <div className="text-xs text-text-muted">在线设备</div>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-50">
                            <Flame className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.cooking}</div>
                            <div className="text-xs text-text-muted">正在烹饪</div>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-50">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.pending}</div>
                            <div className="text-xs text-text-muted">待处理订单</div>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50">
                            <ChefHat className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.todayTotal}</div>
                            <div className="text-xs text-text-muted">今日出餐</div>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-emerald-50">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-text-primary">{stats.avgEfficiency}%</div>
                            <div className="text-xs text-text-muted">平均效率</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-12 gap-6">
                {/* Left: Robot Grid */}
                <div className="col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-text-primary">设备状态</h2>
                        <button className="text-sm text-primary flex items-center gap-1 hover:underline">
                            <RefreshCw className="w-4 h-4" />
                            刷新状态
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {robots.map((robot) => (
                            <div
                                key={robot.id}
                                className={`card p-5 cursor-pointer transition-all hover:shadow-lg ${
                                    selectedRobot === robot.id ? 'ring-2 ring-primary shadow-lg' : ''
                                }`}
                                onClick={() => setSelectedRobot(robot.id)}
                            >
                                {/* Robot Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                            robot.status === 'cooking' ? 'bg-green-100' :
                                            robot.status === 'preheating' ? 'bg-yellow-100' :
                                            robot.status === 'cleaning' ? 'bg-blue-100' :
                                            robot.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                                        }`}>
                                            <Bot className={`w-6 h-6 ${
                                                robot.status === 'cooking' ? 'text-green-600' :
                                                robot.status === 'preheating' ? 'text-yellow-600' :
                                                robot.status === 'cleaning' ? 'text-blue-600' :
                                                robot.status === 'error' ? 'text-red-600' : 'text-gray-600'
                                            }`} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-text-primary">{robot.name}</div>
                                            <div className="text-xs text-text-muted">{robot.model}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getCleanStatusBadge(robot.cleanStatus)}
                                        <span className={`w-3 h-3 rounded-full ${getStatusColor(robot.status)} ${
                                            robot.status === 'cooking' || robot.status === 'preheating' ? 'animate-pulse' : ''
                                        }`}></span>
                                    </div>
                                </div>

                                {/* Status Info */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-3 rounded-xl bg-bg-secondary">
                                        <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
                                            <Activity className="w-3 h-3" />
                                            状态
                                        </div>
                                        <div className="font-semibold text-text-primary">{getStatusLabel(robot.status)}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-bg-secondary">
                                        <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
                                            <Thermometer className="w-3 h-3" />
                                            温度
                                        </div>
                                        <div className="font-semibold text-text-primary">
                                            {robot.temperature}°C
                                            {robot.targetTemperature > 0 && (
                                                <span className="text-xs text-text-muted"> / {robot.targetTemperature}°C</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Current Task */}
                                {(robot.status === 'cooking' || robot.status === 'preheating' || robot.status === 'cleaning') && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-text-primary">
                                                {robot.status === 'cleaning' ? '清洁进度' : robot.currentDish || '准备中'}
                                            </span>
                                            <span className="text-xs text-text-muted">
                                                {Math.floor(robot.timeRemaining / 60)}:{(robot.timeRemaining % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    robot.status === 'cooking' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                                                    robot.status === 'preheating' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                                                    'bg-gradient-to-r from-blue-400 to-blue-600'
                                                }`}
                                                style={{ width: `${robot.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Hopper Quick Status */}
                                <div className="mb-4">
                                    <div className="text-xs text-text-muted mb-2">料仓状态</div>
                                    <div className="flex gap-1">
                                        {robot.hoppers.map((hopper) => (
                                            <div
                                                key={hopper.id}
                                                className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"
                                                title={`${hopper.name}: ${hopper.currentLevel}%`}
                                            >
                                                <div
                                                    className={`h-full rounded-full ${
                                                        hopper.currentLevel <= hopper.lowThreshold ? 'bg-red-500' :
                                                        hopper.currentLevel <= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                    style={{ width: `${hopper.currentLevel}%` }}
                                                ></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border">
                                    <span>今日: {robot.todayDishes} 道</span>
                                    <span>效率: {robot.efficiency}%</span>
                                    <span>运行: {robot.uptime}h</span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-4">
                                    {robot.status === 'idle' && (
                                        <>
                                            <button className="flex-1 btn btn-primary text-xs py-2">
                                                <Power className="w-3 h-3" /> 启动预热
                                            </button>
                                            <button 
                                                className="btn btn-secondary text-xs py-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartClean(robot.id, 'rinse');
                                                }}
                                            >
                                                <Droplets className="w-3 h-3" /> 清洁
                                            </button>
                                        </>
                                    )}
                                    {robot.status === 'cooking' && (
                                        <>
                                            <button className="flex-1 btn btn-secondary text-xs py-2">
                                                <Pause className="w-3 h-3" /> 暂停
                                            </button>
                                            <button className="btn btn-ghost text-xs py-2 text-red-500">
                                                <X className="w-3 h-3" /> 取消
                                            </button>
                                        </>
                                    )}
                                    {robot.status === 'preheating' && (
                                        <button className="flex-1 btn btn-secondary text-xs py-2">
                                            <X className="w-3 h-3" /> 取消预热
                                        </button>
                                    )}
                                    {robot.status === 'cleaning' && (
                                        <div className="flex-1 text-center text-xs text-blue-600 py-2">
                                            <Droplets className="w-3 h-3 inline mr-1 animate-bounce" />
                                            清洁中，请等待...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Detail Panel */}
                <div className="col-span-4 space-y-4">
                    {/* Tabs */}
                    <div className="card p-1 flex gap-1">
                        {[
                            { id: 'queue', label: '待炒队列', icon: ClipboardList },
                            { id: 'hoppers', label: '上料管理', icon: Package },
                            { id: 'clean', label: '清洁维护', icon: Droplets },
                            { id: 'customize', label: '个性炒制', icon: Sparkles },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex-1 flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-text-secondary hover:bg-bg-hover'
                                }`}
                                onClick={() => setActiveTab(tab.id as any)}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Queue Tab */}
                    {activeTab === 'queue' && (
                        <div className="card p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-text-primary">待炒订单</h3>
                                <span className="text-xs text-text-muted">{pendingOrders.length} 单待处理</span>
                            </div>

                            {pendingOrders.length === 0 ? (
                                <div className="text-center py-12 text-text-muted">
                                    <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>暂无待处理订单</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                    {pendingOrders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="p-4 rounded-xl bg-bg-secondary border border-border/50 hover:border-primary/30 transition-all"
                                        >
                                            {/* Order Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-text-primary">{order.orderNumber}</span>
                                                        {getPriorityBadge(order.priority)}
                                                    </div>
                                                    <div className="text-lg font-semibold text-text-primary mt-1">
                                                        {order.dishName} <span className="text-sm text-text-muted">x{order.quantity}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-text-muted">桌号</div>
                                                    <div className="font-bold text-primary">{order.tableNumber}</div>
                                                </div>
                                            </div>

                                            {/* Customer Preferences */}
                                            {order.customerPreferences && (
                                                <div className="p-3 rounded-lg bg-white border border-border/50 mb-3">
                                                    <div className="flex items-center gap-1 text-xs text-text-muted mb-2">
                                                        <User className="w-3 h-3" />
                                                        顾客口味偏好
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                                                            盐: {getLevelLabel(order.customerPreferences.saltLevel)}
                                                        </span>
                                                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-50 text-yellow-700">
                                                            油: {getLevelLabel(order.customerPreferences.oilLevel)}
                                                        </span>
                                                        <span className="px-2 py-1 text-xs rounded-full bg-red-50 text-red-700">
                                                            辣: {getSpiceLevelLabel(order.customerPreferences.spiceLevel)}
                                                        </span>
                                                    </div>
                                                    {order.customerPreferences.notes && (
                                                        <div className="mt-2 text-xs text-text-secondary">
                                                            备注: {order.customerPreferences.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Meta Info */}
                                            <div className="flex items-center justify-between text-xs text-text-muted mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    等待 {order.waitTime}
                                                </span>
                                                <span>预计烹饪 {Math.floor(order.estimatedCookTime / 60)} 分钟</span>
                                            </div>

                                            {/* Push Buttons */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {robots.filter(r => r.status === 'idle' || r.status === 'preheating').slice(0, 2).map((robot) => (
                                                    <button
                                                        key={robot.id}
                                                        className="btn btn-primary text-xs py-2"
                                                        onClick={() => handlePushToRobot(order.id, robot.id)}
                                                    >
                                                        <Send className="w-3 h-3" />
                                                        {robot.name.replace('PanShaker ', '#')}
                                                    </button>
                                                ))}
                                            </div>
                                            {robots.filter(r => r.status === 'idle' || r.status === 'preheating').length === 0 && (
                                                <div className="text-center text-xs text-orange-600 py-2">
                                                    <AlertCircle className="w-3 h-3 inline mr-1" />
                                                    暂无空闲设备
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hoppers Tab */}
                    {activeTab === 'hoppers' && (
                        <div className="card p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-text-primary">上料管理</h3>
                                {selectedRobot && (
                                    <span className="text-xs text-primary">{robots.find(r => r.id === selectedRobot)?.name}</span>
                                )}
                            </div>

                            {!selectedRobot ? (
                                <div className="text-center py-12 text-text-muted">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>请先选择一台设备</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedRobotData?.hoppers.map((hopper) => (
                                        <div key={hopper.id} className="p-4 rounded-xl bg-bg-secondary">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                        hopper.type === 'oil' ? 'bg-yellow-100' :
                                                        hopper.type === 'sauce' ? 'bg-amber-100' :
                                                        hopper.type === 'liquid' ? 'bg-blue-100' : 'bg-orange-100'
                                                    }`}>
                                                        <Droplets className={`w-4 h-4 ${
                                                            hopper.type === 'oil' ? 'text-yellow-600' :
                                                            hopper.type === 'sauce' ? 'text-amber-600' :
                                                            hopper.type === 'liquid' ? 'text-blue-600' : 'text-orange-600'
                                                        }`} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-text-primary">{hopper.name}</div>
                                                        <div className="text-xs text-text-muted">
                                                            {Math.round(hopper.currentLevel * hopper.maxCapacity / 100)} / {hopper.maxCapacity} {hopper.unit}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${
                                                        hopper.currentLevel <= hopper.lowThreshold ? 'text-red-500' :
                                                        hopper.currentLevel <= 40 ? 'text-yellow-500' : 'text-green-500'
                                                    }`}>
                                                        {hopper.currentLevel}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        hopper.currentLevel <= hopper.lowThreshold ? 'bg-red-500' :
                                                        hopper.currentLevel <= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                    }`}
                                                    style={{ width: `${hopper.currentLevel}%` }}
                                                ></div>
                                            </div>
                                            {hopper.currentLevel <= hopper.lowThreshold && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-red-500 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        低量预警
                                                    </span>
                                                    <button
                                                        className="btn btn-primary text-xs py-1.5 px-3"
                                                        onClick={() => handleRefillHopper(selectedRobot, hopper.id)}
                                                    >
                                                        <Plus className="w-3 h-3" /> 添加
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button className="w-full btn btn-secondary mt-4">
                                        <Plus className="w-4 h-4" />
                                        批量上料
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Clean Tab */}
                    {activeTab === 'clean' && (
                        <div className="card p-4 space-y-4">
                            <h3 className="font-bold text-text-primary">清洁维护</h3>

                            {!selectedRobot ? (
                                <div className="text-center py-12 text-text-muted">
                                    <Droplets className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>请先选择一台设备</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Current Status */}
                                    <div className="p-4 rounded-xl bg-bg-secondary">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-text-muted">当前状态</span>
                                            {getCleanStatusBadge(selectedRobotData?.cleanStatus || '')}
                                        </div>
                                        <div className="text-xs text-text-muted">
                                            上次清洁: {selectedRobotData?.lastCleanTime}
                                        </div>
                                    </div>

                                    {/* Clean Options */}
                                    <div className="space-y-3">
                                        <button
                                            className="w-full p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-left"
                                            onClick={() => handleStartClean(selectedRobot, 'rinse')}
                                            disabled={selectedRobotData?.status === 'cooking' || selectedRobotData?.status === 'cleaning'}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                                                    <Droplets className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-blue-800">快速冲洗</div>
                                                    <div className="text-xs text-blue-600">约 1 分钟 · 适合菜品间隙</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            className="w-full p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all text-left"
                                            onClick={() => handleStartClean(selectedRobot, 'deep')}
                                            disabled={selectedRobotData?.status === 'cooking' || selectedRobotData?.status === 'cleaning'}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                                                    <Sparkles className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-purple-800">深度清洁</div>
                                                    <div className="text-xs text-purple-600">约 3 分钟 · 含清洁剂 · 建议每日</div>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            className="w-full p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all text-left"
                                            disabled
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-400 flex items-center justify-center">
                                                    <Settings2 className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-700">维护保养</div>
                                                    <div className="text-xs text-gray-500">需联系技术人员</div>
                                                </div>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Clean Log */}
                                    <div className="pt-4 border-t border-border">
                                        <div className="text-sm font-medium text-text-primary mb-3">清洁记录</div>
                                        <div className="space-y-2 text-xs text-text-muted">
                                            <div className="flex justify-between">
                                                <span>11:00 快速冲洗</span>
                                                <span className="text-green-600">完成</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>08:30 深度清洁</span>
                                                <span className="text-green-600">完成</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>昨日 22:00 深度清洁</span>
                                                <span className="text-green-600">完成</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Customize Tab */}
                    {activeTab === 'customize' && (
                        <div className="card p-4 space-y-4">
                            <h3 className="font-bold text-text-primary">个性化炒制</h3>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-orange-600" />
                                    <span className="font-semibold text-orange-800">智能口味调节</span>
                                </div>
                                <p className="text-xs text-orange-700">
                                    根据顾客的历史偏好和订单备注，自动调整烹饪参数，实现千人千味。
                                </p>
                            </div>

                            {/* Taste Parameters */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-text-primary mb-2 block">盐度调节</label>
                                    <div className="flex gap-2">
                                        {['清淡 -30%', '少盐 -15%', '标准', '偏咸 +15%', '重口 +30%'].map((level, i) => (
                                            <button
                                                key={level}
                                                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                                                    i === 2 ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-primary mb-2 block">油量调节</label>
                                    <div className="flex gap-2">
                                        {['少油 -30%', '轻油 -15%', '标准', '多油 +15%', '重油 +30%'].map((level, i) => (
                                            <button
                                                key={level}
                                                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                                                    i === 2 ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-primary mb-2 block">辣度调节</label>
                                    <div className="flex gap-2">
                                        {['不辣', '微辣', '中辣', '重辣', '特辣'].map((level, i) => (
                                            <button
                                                key={level}
                                                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                                                    i === 2 ? 'bg-red-500 text-white border-red-500' : 'border-border hover:border-red-300'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-text-primary mb-2 block">火候控制</label>
                                    <div className="flex gap-2">
                                        {['文火慢炒', '中火', '大火快炒'].map((level, i) => (
                                            <button
                                                key={level}
                                                className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                                                    i === 1 ? 'bg-orange-500 text-white border-orange-500' : 'border-border hover:border-orange-300'
                                                }`}
                                            >
                                                {level}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* VIP Profiles */}
                            <div className="pt-4 border-t border-border">
                                <div className="text-sm font-medium text-text-primary mb-3">VIP 顾客口味档案</div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">王先生</div>
                                                <div className="text-xs text-text-muted">少盐少油 · 微辣</div>
                                            </div>
                                        </div>
                                        <button className="text-xs text-primary">应用</button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                                <User className="w-4 h-4 text-pink-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium">李女士</div>
                                                <div className="text-xs text-text-muted">标准 · 不辣 · 少糖</div>
                                            </div>
                                        </div>
                                        <button className="text-xs text-primary">应用</button>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full btn btn-primary mt-4">
                                <Check className="w-4 h-4" />
                                保存为默认配置
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Missing import fix
const ClipboardList = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <path d="M12 11h4"/>
        <path d="M12 16h4"/>
        <path d="M8 11h.01"/>
        <path d="M8 16h.01"/>
    </svg>
);
