'use client';

import type { ReactNode } from 'react';

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    count?: number;
    actions?: ReactNode;
    className?: string;
}

export function SectionHeader({ title, subtitle, count, actions, className = '' }: SectionHeaderProps) {
    return (
        <div className={`flex items-center justify-between py-3 ${className}`}>
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                {typeof count === 'number' && (
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-xs bg-surface-sunken text-text-secondary text-xs font-bold tabular-nums">
                        {count}
                    </span>
                )}
                {subtitle && (
                    <span className="text-sm text-text-muted">{subtitle}</span>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    );
}
