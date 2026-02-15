import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { SidebarWrapper } from '@/components/layout/SidebarWrapper';

export const metadata: Metadata = {
    title: 'Synapse OS - 智能餐饮管理系统',
    description: '下一代智能餐饮管理操作系统，集成 POS、KDS、外卖聚合等功能',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-CN">
            <body className="bg-bg-secondary min-h-screen">
                <Providers>
                    <SidebarWrapper>{children}</SidebarWrapper>
                </Providers>
            </body>
        </html>
    );
}

