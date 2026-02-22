'use client';

type Platform = 'UberEats' | 'DoorDash' | 'GrubHub' | 'Fantuan' | 'Meituan' | 'Eleme' | 'direct';

interface PlatformBadgeProps {
    platform: Platform;
    className?: string;
}

const PLATFORM_STYLES: Record<Platform, { label: string; bg: string; fg: string }> = {
    Meituan:  { label: '美团',     bg: '#FFC107', fg: '#1A1A1A' },
    Eleme:    { label: '饿了么',   bg: '#005BBB', fg: '#FFFFFF' },
    DoorDash: { label: 'DoorDash', bg: '#CC1100', fg: '#FFFFFF' },
    UberEats: { label: 'UberEats', bg: '#00A550', fg: '#FFFFFF' },
    GrubHub:  { label: 'GrubHub',  bg: '#FF8C00', fg: '#1A1A1A' },
    Fantuan:  { label: 'Fantuan',  bg: '#FF6B35', fg: '#FFFFFF' },
    direct:   { label: '自营',     bg: '#1A1A1A', fg: '#FFFFFF' },
};

export function PlatformBadge({ platform, className = '' }: PlatformBadgeProps) {
    const style = PLATFORM_STYLES[platform];
    if (!style) return null;

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-xs text-xs font-bold uppercase tracking-wider ${className}`}
            style={{ backgroundColor: style.bg, color: style.fg }}
        >
            {style.label}
        </span>
    );
}
