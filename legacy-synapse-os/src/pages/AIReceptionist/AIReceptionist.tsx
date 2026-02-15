import React, { useState } from 'react';
import { aiReceptionistService } from '../../services/aiReceptionist';
import type { CallRecord } from '../../services/aiReceptionist';
import './AIReceptionist.css';

// 模拟通话记录
const mockCallRecords: CallRecord[] = [
    {
        id: 'CALL_001',
        phoneNumber: '+1-555-123-4567',
        callStartTime: new Date(Date.now() - 30 * 60 * 1000),
        callEndTime: new Date(Date.now() - 25 * 60 * 1000),
        duration: 300,
        transcript: [
            { role: 'ai', text: '您好，欢迎致电 Synapse 中餐厅，请问有什么可以帮您？', timestamp: 0 },
            { role: 'customer', text: '我想点个外卖', timestamp: 3 },
            { role: 'ai', text: '好的，请问您想点什么菜？', timestamp: 5 },
            { role: 'customer', text: '一份宫保鸡丁，一份蛋炒饭', timestamp: 8 },
            { role: 'ai', text: '好的，一份宫保鸡丁 $15.99，一份蛋炒饭 $8.99，共 $24.98。请问送到哪里？', timestamp: 12 },
        ],
        extractedOrder: {
            items: [
                { name: '宫保鸡丁', quantity: 1 },
                { name: '蛋炒饭', quantity: 1 },
            ],
            orderType: 'delivery',
            customerName: 'John',
            deliveryAddress: '123 Main St',
        },
        orderCreated: true,
        orderId: 'ORD_12345',
    },
    {
        id: 'CALL_002',
        phoneNumber: '+1-555-987-6543',
        callStartTime: new Date(Date.now() - 60 * 60 * 1000),
        callEndTime: new Date(Date.now() - 55 * 60 * 1000),
        duration: 180,
        transcript: [
            { role: 'ai', text: '您好，欢迎致电 Synapse 中餐厅。', timestamp: 0 },
            { role: 'customer', text: '我想订一份麻婆豆腐，自取', timestamp: 3 },
        ],
        extractedOrder: {
            items: [{ name: '麻婆豆腐', quantity: 1 }],
            orderType: 'pickup',
        },
        orderCreated: true,
        orderId: 'ORD_12344',
    },
];

export const AIReceptionist: React.FC = () => {
    const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const status = aiReceptionistService.getStatus();

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="ai-receptionist-page page">
            <div className="page-header">
                <div className="container">
                    <h1 className="page-title">🤖 AI 接线员</h1>
                    <p className="page-subtitle">智能语音客服 - 自动接听电话并处理订单</p>
                </div>
            </div>

            <div className="page-content">
                <div className="container">
                    {/* 服务状态 */}
                    <div className="service-status-grid">
                        <div className="status-card card">
                            <div className="status-header">
                                <h3>📞 VoIP 电话服务</h3>
                                <span className={`status-badge ${status.voip ? 'connected' : 'disconnected'}`}>
                                    {status.voip ? '已配置' : '未配置'}
                                </span>
                            </div>
                            <p className="status-desc">接收和拨打电话</p>
                            <div className="provider-hint">推荐: Twilio Voice, Vonage</div>
                        </div>

                        <div className="status-card card">
                            <div className="status-header">
                                <h3>🎤 ASR 语音识别</h3>
                                <span className={`status-badge ${status.asr ? 'connected' : 'disconnected'}`}>
                                    {status.asr ? '已配置' : '未配置'}
                                </span>
                            </div>
                            <p className="status-desc">实时语音转文字</p>
                            <div className="provider-hint">推荐: Deepgram (实时), Whisper (精度)</div>
                        </div>

                        <div className="status-card card">
                            <div className="status-header">
                                <h3>🧠 LLM 意图理解</h3>
                                <span className={`status-badge ${status.llm ? 'connected' : 'disconnected'}`}>
                                    {status.llm ? '已配置' : '未配置'}
                                </span>
                            </div>
                            <p className="status-desc">理解订单并生成回复</p>
                            <div className="provider-hint">推荐: GPT-4o, Claude 3.5, Qwen</div>
                        </div>

                        <div className="status-card card">
                            <div className="status-header">
                                <h3>🔊 TTS 语音合成</h3>
                                <span className={`status-badge ${status.tts ? 'connected' : 'disconnected'}`}>
                                    {status.tts ? '已配置' : '未配置'}
                                </span>
                            </div>
                            <p className="status-desc">AI 语音回复顾客</p>
                            <div className="provider-hint">推荐: ElevenLabs, OpenAI TTS</div>
                        </div>
                    </div>

                    {/* 主控制 */}
                    <div className="control-panel card">
                        <div className="control-header">
                            <div>
                                <h2>接线员状态</h2>
                                <p className="text-muted">启用后，AI 将自动接听所有来电</p>
                            </div>
                            <div className="control-actions">
                                <button
                                    className={`toggle-btn large ${isEnabled ? 'active' : ''}`}
                                    onClick={() => setIsEnabled(!isEnabled)}
                                    disabled={!status.voip || !status.asr || !status.llm || !status.tts}
                                >
                                    <span className="toggle-knob"></span>
                                </button>
                                <span className={`status-text ${isEnabled ? 'active' : ''}`}>
                                    {isEnabled ? '🟢 运行中' : '⚪ 已停止'}
                                </span>
                            </div>
                        </div>

                        {(!status.voip || !status.asr || !status.llm || !status.tts) && (
                            <div className="config-warning">
                                ⚠️ 请先配置所有必需的服务（VoIP、ASR、LLM、TTS）才能启用 AI 接线员
                            </div>
                        )}
                    </div>

                    {/* 通话记录和详情 */}
                    <div className="calls-section">
                        <div className="calls-list card">
                            <div className="card-header">
                                <h2 className="card-title">📋 通话记录</h2>
                                <span className="call-count">{mockCallRecords.length} 通</span>
                            </div>
                            <div className="calls-items">
                                {mockCallRecords.map(call => (
                                    <div
                                        key={call.id}
                                        className={`call-item ${selectedCall?.id === call.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedCall(call)}
                                    >
                                        <div className="call-icon">📞</div>
                                        <div className="call-info">
                                            <div className="call-number">{call.phoneNumber}</div>
                                            <div className="call-meta">
                                                <span>{formatTime(call.callStartTime)}</span>
                                                <span>{formatDuration(call.duration || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="call-status">
                                            {call.orderCreated ? (
                                                <span className="order-created">✅ 已下单</span>
                                            ) : (
                                                <span className="no-order">未下单</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 通话详情 */}
                        <div className="call-detail card">
                            {selectedCall ? (
                                <>
                                    <div className="card-header">
                                        <h2 className="card-title">通话详情</h2>
                                        <span className="call-id">{selectedCall.id}</span>
                                    </div>

                                    <div className="detail-section">
                                        <h4>📝 对话记录</h4>
                                        <div className="transcript">
                                            {selectedCall.transcript.map((msg, idx) => (
                                                <div key={idx} className={`transcript-msg ${msg.role}`}>
                                                    <span className="msg-role">{msg.role === 'ai' ? '🤖 AI' : '👤 顾客'}</span>
                                                    <span className="msg-text">{msg.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedCall.extractedOrder && (
                                        <div className="detail-section">
                                            <h4>🛒 提取的订单</h4>
                                            <div className="extracted-order">
                                                <div className="order-items">
                                                    {selectedCall.extractedOrder.items.map((item, idx) => (
                                                        <div key={idx} className="order-item">
                                                            <span>{item.quantity}x</span>
                                                            <span>{item.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="order-type">
                                                    {selectedCall.extractedOrder.orderType === 'delivery' ? '🚗 外卖' : '🏠 自取'}
                                                </div>
                                                {selectedCall.extractedOrder.deliveryAddress && (
                                                    <div className="order-address">
                                                        📍 {selectedCall.extractedOrder.deliveryAddress}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {selectedCall.orderId && (
                                        <div className="order-link">
                                            <span>订单号:</span>
                                            <a href="#">{selectedCall.orderId}</a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-selection">
                                    <span className="icon">👆</span>
                                    <p>选择一个通话查看详情</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIReceptionist;
