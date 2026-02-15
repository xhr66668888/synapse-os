'use client';

import { useState, useEffect, useRef } from 'react';

// Mock 通话数据
interface Call {
    id: string;
    phone: string;
    caller: string;
    status: 'ringing' | 'active' | 'completed' | 'missed';
    duration: string;
    time: string;
    transcript?: string[];
    intent?: string;
}

const mockCalls: Call[] = [
    {
        id: 'C001', phone: '555-1234', caller: 'Unknown', status: 'completed',
        duration: '2:35', time: '5 分钟前', intent: '订餐',
        transcript: ['您好，请问可以订餐吗？', '当然可以，请问几位用餐？', '2位，想订一份宫保鸡丁', '好的，已为您下单'],
    },
    {
        id: 'C002', phone: '555-5678', caller: 'Mike', status: 'missed',
        duration: '0:00', time: '10 分钟前',
    },
    {
        id: 'C003', phone: '555-9012', caller: '张先生', status: 'completed',
        duration: '1:20', time: '20 分钟前', intent: '预约',
        transcript: ['我想预定今晚6点的桌位', '好的，请问几位？', '4位', '已为您预留 3 号桌'],
    },
];

export function AIReceptionistContent() {
    const [calls, setCalls] = useState<Call[]>(mockCalls);
    const [selectedCall, setSelectedCall] = useState<Call | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [aiStatus, setAiStatus] = useState<'idle' | 'listening' | 'speaking'>('idle');

    // 模拟 AI 状态变化
    useEffect(() => {
        if (isListening) {
            const interval = setInterval(() => {
                setAiStatus((prev) => (prev === 'listening' ? 'speaking' : 'listening'));
            }, 3000);
            return () => clearInterval(interval);
        } else {
            setAiStatus('idle');
        }
    }, [isListening]);

    const stats = {
        today: calls.length,
        answered: calls.filter((c) => c.status === 'completed').length,
        missed: calls.filter((c) => c.status === 'missed').length,
        avgDuration: '1:45',
    };

    return (
        <div className="min-h-screen bg-bg-secondary">
            {/* 头部 */}
            <header className="bg-white px-8 py-6 border-b border-border-light shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">🤖 AI 接线员</h1>
                    <p className="text-sm text-text-muted mt-1">
                        智能电话接听与订餐服务
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isListening ? 'bg-success-bg text-success' : 'bg-gray-100 text-text-muted'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-success animate-pulse' : 'bg-gray-400'}`} />
                        {isListening ? 'AI 在线接听中' : 'AI 已离线'}
                    </div>
                    <button
                        onClick={() => setIsListening(!isListening)}
                        className={`btn ${isListening ? 'btn-secondary' : 'btn-primary'}`}
                    >
                        {isListening ? '停止接听' : '开始接听'}
                    </button>
                </div>
            </header>

            <div className="p-8">
                {/* 统计卡片 */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <StatCard icon="📞" value={stats.today} label="今日来电" />
                    <StatCard icon="✅" value={stats.answered} label="已接听" />
                    <StatCard icon="❌" value={stats.missed} label="未接听" />
                    <StatCard icon="⏱️" value={stats.avgDuration} label="平均通话" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* AI 状态面板 */}
                    <div className="card p-6 text-center">
                        <div className="relative w-40 h-40 mx-auto mb-6">
                            {/* 动画波纹 */}
                            {isListening && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                                    <div className="absolute inset-4 rounded-full bg-primary/30 animate-ping" style={{ animationDelay: '0.5s' }} />
                                </>
                            )}
                            <div className={`absolute inset-0 rounded-full flex items-center justify-center text-6xl transition-colors ${isListening ? 'bg-primary-100' : 'bg-gray-100'
                                }`}>
                                🤖
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {aiStatus === 'idle' && 'AI 待机中'}
                            {aiStatus === 'listening' && '正在聆听...'}
                            {aiStatus === 'speaking' && '正在回复...'}
                        </h3>
                        <p className="text-sm text-text-muted">
                            {isListening
                                ? '已准备好接听来电并处理订单'
                                : '点击"开始接听"启动 AI 接线员'}
                        </p>

                        <div className="mt-6 p-4 bg-bg-tertiary rounded-xl text-left">
                            <h4 className="font-medium text-text-primary mb-2">AI 能力</h4>
                            <ul className="text-sm text-text-muted space-y-1">
                                <li>✓ 自动接听来电</li>
                                <li>✓ 识别订餐意图</li>
                                <li>✓ 处理桌位预约</li>
                                <li>✓ 回答常见问题</li>
                                <li>✓ 自动创建订单</li>
                            </ul>
                        </div>
                    </div>

                    {/* 通话记录 */}
                    <div className="card">
                        <div className="p-4 border-b border-border-light">
                            <h3 className="font-semibold text-text-primary">通话记录</h3>
                        </div>
                        <div className="divide-y divide-border-light max-h-96 overflow-y-auto">
                            {calls.map((call) => (
                                <button
                                    key={call.id}
                                    onClick={() => setSelectedCall(call)}
                                    className={`w-full p-4 text-left hover:bg-bg-hover transition-colors ${selectedCall?.id === call.id ? 'bg-bg-hover' : ''
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-text-primary">{call.phone}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${call.status === 'completed' ? 'bg-success-bg text-success' :
                                                call.status === 'missed' ? 'bg-error-bg text-error' :
                                                    call.status === 'active' ? 'bg-primary-100 text-primary' :
                                                        'bg-warning-bg text-warning'
                                            }`}>
                                            {call.status === 'completed' && '已完成'}
                                            {call.status === 'missed' && '未接听'}
                                            {call.status === 'active' && '通话中'}
                                            {call.status === 'ringing' && '响铃中'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-text-muted">
                                        <span>{call.caller}</span>
                                        <span>{call.time} · {call.duration}</span>
                                    </div>
                                    {call.intent && (
                                        <div className="mt-1 text-xs text-primary">意图: {call.intent}</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 通话详情 */}
                    <div className="card">
                        {selectedCall ? (
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-text-primary">{selectedCall.phone}</h3>
                                    <span className={`text-sm px-3 py-1 rounded-full ${selectedCall.status === 'completed' ? 'bg-success-bg text-success' : 'bg-error-bg text-error'
                                        }`}>
                                        {selectedCall.status === 'completed' ? '已完成' : '未接听'}
                                    </span>
                                </div>

                                <div className="p-4 bg-bg-tertiary rounded-xl space-y-2 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">来电者</span>
                                        <span className="text-text-primary">{selectedCall.caller}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">时间</span>
                                        <span className="text-text-primary">{selectedCall.time}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-muted">时长</span>
                                        <span className="text-text-primary">{selectedCall.duration}</span>
                                    </div>
                                    {selectedCall.intent && (
                                        <div className="flex justify-between">
                                            <span className="text-text-muted">识别意图</span>
                                            <span className="text-primary">{selectedCall.intent}</span>
                                        </div>
                                    )}
                                </div>

                                {selectedCall.transcript && (
                                    <div>
                                        <h4 className="font-medium text-text-primary mb-3">对话记录</h4>
                                        <div className="space-y-2">
                                            {selectedCall.transcript.map((msg, i) => (
                                                <div
                                                    key={i}
                                                    className={`p-3 rounded-xl text-sm ${i % 2 === 0
                                                            ? 'bg-bg-tertiary text-text-primary'
                                                            : 'bg-primary text-white ml-8'
                                                        }`}
                                                >
                                                    {msg}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-text-muted">
                                <div className="text-5xl mb-3">📞</div>
                                <p>选择通话查看详情</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
    return (
        <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center text-lg">{icon}</div>
            <div>
                <div className="text-xl font-bold text-text-primary">{value}</div>
                <div className="text-xs text-text-muted">{label}</div>
            </div>
        </div>
    );
}
