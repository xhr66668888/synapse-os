import React, { useState } from 'react';
import { useUserStore, useTastePreference, useCurrentUser } from '../../stores/userStore';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import './Profile.css';

// 口味等级标签
const tasteLabels = {
    salt: ['极淡', '偏淡', '正常', '偏咸', '重咸'],
    spice: ['不辣', '微辣', '中辣', '辣', '特辣'],
    oil: ['少油', '偏少', '正常', '偏多', '多油'],
    sweetness: ['不甜', '微甜', '正常', '偏甜', '很甜'],
};

export const Profile: React.FC = () => {
    const currentUser = useCurrentUser();
    const tastePreference = useTastePreference();
    const { updateTastePreference, logout } = useUserStore();
    const hasTasteCustomization = useFeatureFlag('tasteCustomization');

    const [isEditing, setIsEditing] = useState(false);
    const [localPreference, setLocalPreference] = useState({
        salt_level: tastePreference?.salt_level || 3,
        spice_level: tastePreference?.spice_level || 3,
        oil_level: tastePreference?.oil_level || 3,
        sweetness: tastePreference?.sweetness || 3,
    });

    // 登录表单状态
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await useUserStore.getState().login(loginEmail, loginPassword);
        if (!result.success) {
            setLoginError(result.error || '登录失败');
        }
    };

    const handleSavePreference = () => {
        updateTastePreference(localPreference);
        setIsEditing(false);
    };

    const TasteSlider = ({
        label,
        icon,
        value,
        labels,
        onChange,
        color
    }: {
        label: string;
        icon: string;
        value: number;
        labels: string[];
        onChange: (v: number) => void;
        color: string;
    }) => (
        <div className="taste-slider-group">
            <div className="slider-header">
                <span className="slider-icon">{icon}</span>
                <span className="slider-label">{label}</span>
                <span className="slider-value" style={{ color }}>{labels[value - 1]}</span>
            </div>
            <input
                type="range"
                min="1"
                max="5"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                disabled={!isEditing}
                className="taste-range"
                style={{ '--slider-color': color } as React.CSSProperties}
            />
            <div className="slider-ticks">
                {labels.map((l, i) => (
                    <span key={i} className={i + 1 === value ? 'active' : ''}>{l}</span>
                ))}
            </div>
        </div>
    );

    // 未登录状态
    if (!currentUser) {
        return (
            <div className="profile-page page">
                <div className="page-header">
                    <div className="container">
                        <h1 className="page-title">👤 账户中心</h1>
                    </div>
                </div>
                <div className="page-content">
                    <div className="container">
                        <div className="login-card card">
                            <div className="login-header">
                                <span className="login-icon">🔐</span>
                                <h2>登录 Synapse OS</h2>
                                <p className="text-muted">登录后享受个性化口味定制服务</p>
                            </div>

                            <form onSubmit={handleLogin} className="login-form">
                                {loginError && <div className="login-error">{loginError}</div>}

                                <div className="form-group">
                                    <label className="form-label">邮箱</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="your@email.com"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">密码</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                    />
                                </div>

                                <button type="submit" className="btn btn-gold btn-lg login-btn">
                                    登录
                                </button>

                                <p className="demo-hint">
                                    💡 演示模式：输入任意邮箱密码即可登录
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 已登录状态
    return (
        <div className="profile-page page">
            <div className="page-header">
                <div className="container">
                    <h1 className="page-title">👤 我的账户</h1>
                    <p className="page-subtitle">管理个人信息和口味偏好</p>
                </div>
            </div>

            <div className="page-content">
                <div className="container">
                    <div className="profile-grid">
                        {/* 用户信息卡片 */}
                        <div className="card user-card">
                            <div className="user-header">
                                <div className="user-avatar-large">
                                    {currentUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info">
                                    <h2>{currentUser.name}</h2>
                                    <p className="text-muted">{currentUser.email}</p>
                                    <span className="badge badge-gold">Gold 会员</span>
                                </div>
                            </div>
                            <div className="user-stats">
                                <div className="stat">
                                    <span className="stat-value">28</span>
                                    <span className="stat-label">历史订单</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">$842</span>
                                    <span className="stat-label">累计消费</span>
                                </div>
                                <div className="stat">
                                    <span className="stat-value">156</span>
                                    <span className="stat-label">积分</span>
                                </div>
                            </div>
                            <button className="btn btn-ghost" onClick={logout}>
                                退出登录
                            </button>
                        </div>

                        {/* 口味偏好设置 (Gold 专属) */}
                        {hasTasteCustomization && (
                            <div className="card taste-card">
                                <div className="card-header">
                                    <div>
                                        <h2 className="card-title">🎛️ 口味偏好</h2>
                                        <p className="text-muted">您的专属口味将自动应用到机器人烹饪</p>
                                    </div>
                                    {isEditing ? (
                                        <div className="edit-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>
                                                取消
                                            </button>
                                            <button className="btn btn-gold btn-sm" onClick={handleSavePreference}>
                                                保存
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)}>
                                            编辑
                                        </button>
                                    )}
                                </div>

                                <div className="taste-sliders">
                                    <TasteSlider
                                        label="咸度"
                                        icon="🧂"
                                        value={localPreference.salt_level}
                                        labels={tasteLabels.salt}
                                        onChange={(v) => setLocalPreference(p => ({ ...p, salt_level: v }))}
                                        color="#6b7280"
                                    />
                                    <TasteSlider
                                        label="辣度"
                                        icon="🌶️"
                                        value={localPreference.spice_level}
                                        labels={tasteLabels.spice}
                                        onChange={(v) => setLocalPreference(p => ({ ...p, spice_level: v }))}
                                        color="#ef4444"
                                    />
                                    <TasteSlider
                                        label="油量"
                                        icon="🫒"
                                        value={localPreference.oil_level}
                                        labels={tasteLabels.oil}
                                        onChange={(v) => setLocalPreference(p => ({ ...p, oil_level: v }))}
                                        color="#eab308"
                                    />
                                    <TasteSlider
                                        label="甜度"
                                        icon="🍯"
                                        value={localPreference.sweetness}
                                        labels={tasteLabels.sweetness}
                                        onChange={(v) => setLocalPreference(p => ({ ...p, sweetness: v }))}
                                        color="#f97316"
                                    />
                                </div>

                                <div className="taste-tip">
                                    <span className="tip-icon">💡</span>
                                    <span>您的口味偏好会自动转换为机器人参数，确保每道菜都符合您的口味</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 评价反馈 */}
                    <div className="card feedback-card">
                        <div className="card-header">
                            <h2 className="card-title">📝 口味反馈</h2>
                        </div>
                        <p className="text-muted mb-md">
                            您的评价会帮助我们优化您的口味偏好设置
                        </p>

                        <div className="feedback-history">
                            <div className="feedback-item">
                                <div className="feedback-dish">宫保鸡丁</div>
                                <div className="feedback-rating">
                                    <span>⭐⭐⭐⭐⭐</span>
                                    <span className="feedback-note">"咸淡刚好，辣度完美"</span>
                                </div>
                                <span className="feedback-date">2026-01-25</span>
                            </div>
                            <div className="feedback-item">
                                <div className="feedback-dish">麻婆豆腐</div>
                                <div className="feedback-rating">
                                    <span>⭐⭐⭐⭐</span>
                                    <span className="feedback-note">"可以再辣一点"</span>
                                </div>
                                <span className="feedback-date">2026-01-23</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
