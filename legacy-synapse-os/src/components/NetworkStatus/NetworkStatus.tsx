import React, { useState, useEffect } from 'react';
import './NetworkStatus.css';

export const NetworkStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        // 初始检查
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(true);
            setTimeout(() => setShowBanner(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner) return null;

    return (
        <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-icon">{isOnline ? '🌐' : '📴'}</span>
            <span className="status-text">
                {isOnline
                    ? '网络已恢复连接'
                    : '已进入离线模式，数据将在恢复后同步'}
            </span>
            <button className="dismiss-btn" onClick={() => setShowBanner(false)}>
                ✕
            </button>
        </div>
    );
};

export default NetworkStatus;
