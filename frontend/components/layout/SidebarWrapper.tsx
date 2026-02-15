'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { NetworkStatus } from '../ui/NetworkStatus';
import { AIAssistantModal } from '../ai-assistant';

// 不需要侧边栏的页面路径
const noSidebarPaths = ['/login', '/unauthorized'];

export function SidebarWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const showSidebar = !noSidebarPaths.some((path) => pathname.startsWith(path));

    if (!showSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            <NetworkStatus />
            <Sidebar />
            <main className="flex-1 ml-60">{children}</main>
            <AIAssistantModal />
        </div>
    );
}
