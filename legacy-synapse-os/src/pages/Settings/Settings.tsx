import React from 'react';
import { useLicenseType, useFeatureFlag } from '../../hooks/useFeatureFlag';
import './Settings.css';
import '../../components/CssIcons.css';

export const Settings: React.FC = () => {
    const licenseType = useLicenseType();
    const hasTaste = useFeatureFlag('tasteCustomization');
    const hasRobot = useFeatureFlag('robotControl');

    return (
        <div className="settings-page page">
            <header className="page-header">
                <div className="container">
                    <h1 className="page-title">系统设置</h1>
                </div>
            </header>

            <div className="page-content">
                <div className="container">
                    <div className="settings-grid">

                        {/* 许可证设置 */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <img src="/assets/icon-settings-new.png" className="settings-card-icon-img" alt="License" />
                                <h2 className="settings-card-title">许可证类型</h2>
                            </div>
                            <div className="settings-card-body">
                                <div className="license-options">
                                    <div className={`license-option ${licenseType === 'LITE' ? 'active' : ''}`}>
                                        <div className="license-name">LITE</div>
                                        <div className="license-price">基础版</div>
                                    </div>
                                    <div className={`license-option ${licenseType === 'STANDARD' ? 'active' : ''}`}>
                                        <div className="license-name">STANDARD</div>
                                        <div className="license-price">标准版</div>
                                    </div>
                                    <div className={`license-option gold ${licenseType === 'GOLD' ? 'active' : ''}`}>
                                        <div className="license-name">GOLD</div>
                                        <div className="license-price">企业版</div>
                                    </div>
                                </div>
                                <div className="setting-desc mt-md">
                                    当前启用功能:
                                    <div className="feature-badges mt-sm">
                                        {hasTaste && <span className="badge badge-success mr-xs">口味定制</span>}
                                        {hasRobot && <span className="badge badge-success mr-xs">机器人控制</span>}
                                        <span className="badge badge-secondary">基础POS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 音乐播放器设置 */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <img src="/assets/icon-music.png" className="settings-card-icon-img" alt="Music" />
                                <h2 className="settings-card-title">背景音乐</h2>
                            </div>
                            <div className="settings-card-body">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <span className="setting-label-text">默认音量</span>
                                    </div>
                                    <div className="volume-slider">
                                        <img src="/assets/icon-settings-new.png" alt="Low" style={{ width: '12px', opacity: 0.5 }} />
                                        <input type="range" min="0" max="100" defaultValue="60" />
                                        <span className="volume-value">60%</span>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <span className="setting-label-text">自动播放</span>
                                        <span className="setting-label-desc">营业时间自动播放歌单</span>
                                    </div>
                                    <label className="toggle-btn active">
                                        <input type="checkbox" defaultChecked />
                                        <span className="toggle-knob"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 打印机设置 */}
                        <div className="settings-card">
                            <div className="settings-card-header">
                                <img src="/assets/icon-settings-new.png" className="settings-card-icon-img" alt="Printer" />
                                <h2 className="settings-card-title">打印机</h2>
                            </div>
                            <div className="settings-card-body">
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <span className="setting-label-text">后厨打印机</span>
                                    </div>
                                    <span className="text-success text-sm">● 已连接 (EPSON TM-88V)</span>
                                </div>
                                <div className="setting-item">
                                    <div className="setting-label">
                                        <span className="setting-label-text">前台打印机</span>
                                    </div>
                                    <span className="text-error text-sm">○ 未连接</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
