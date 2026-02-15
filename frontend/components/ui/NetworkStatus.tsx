'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

export function NetworkStatus() {
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
        <div
            className={`fixed top-0 left-60 right-0 z-50 px-4 py-3 flex items-center justify-center gap-3 transition-all duration-300 ${isOnline
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-yellow-900'
                }`}
        >
            {isOnline ? (
                <Wifi className="w-5 h-5" />
            ) : (
                <WifiOff className="w-5 h-5" />
            )}
            <span className="font-medium">
                {isOnline
                    ? '网络已恢复连接'
                    : '已进入离线模式，数据将在恢复后同步'}
            </span>
            <button
                className="ml-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                onClick={() => setShowBanner(false)}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default NetworkStatus;
