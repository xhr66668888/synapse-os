'use client';

type BadgeState =
    | 'pending'
    | 'preparing'
    | 'ready'
    | 'served'
    | 'completed'
    | 'cancelled'
    | 'listed'
    | 'delisted'
    | 'new'
    | 'picked_up'
    | 'delivered'
    | 'paid'
    | 'refunded';

interface StateBadgeProps {
    state: BadgeState;
    size?: 'sm' | 'md' | 'lg';
    pulse?: boolean;
    className?: string;
}

const STATE_CONFIG: Record<BadgeState, { label: string; cssClass: string }> = {
    pending:    { label: '待处理', cssClass: 'badge-pending' },
    preparing:  { label: '制作中', cssClass: 'badge-preparing' },
    ready:      { label: '已完成', cssClass: 'badge-ready' },
    served:     { label: '已上菜', cssClass: 'badge-served' },
    completed:  { label: '已完成', cssClass: 'badge-ready' },
    cancelled:  { label: '已取消', cssClass: 'badge-danger' },
    listed:     { label: '已上架', cssClass: 'badge-ready' },
    delisted:   { label: '已下架', cssClass: 'badge-danger' },
    new:        { label: '新订单', cssClass: 'badge-pending' },
    picked_up:  { label: '已取餐', cssClass: 'badge-served' },
    delivered:  { label: '已送达', cssClass: 'badge-ready' },
    paid:       { label: '已支付', cssClass: 'badge-ready' },
    refunded:   { label: '已退款', cssClass: 'badge-danger' },
};

const SIZE_CLASSES = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: '',
    lg: 'text-sm px-3 py-1',
};

export function StateBadge({ state, size = 'md', pulse = false, className = '' }: StateBadgeProps) {
    const config = STATE_CONFIG[state];
    if (!config) return null;

    return (
        <span
            className={`${config.cssClass} ${SIZE_CLASSES[size]} ${pulse ? 'animate-pulse' : ''} ${className}`}
            aria-label={config.label}
        >
            {config.label}
        </span>
    );
}
