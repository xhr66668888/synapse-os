'use client';

import { Clock, AlertTriangle } from 'lucide-react';

export type UrgencyLevel = 'normal' | 'warning' | 'critical';

interface OrderItem {
    name: string;
    quantity: number;
    notes?: string;
}

interface OrderTicketCardProps {
    orderNumber: string;
    orderType?: string;
    tableNumber?: string | number;
    waitMinutes: number;
    items: OrderItem[];
    urgencyLevel?: UrgencyLevel;
    actionLabel: string;
    onAction: () => void;
    className?: string;
}

function getUrgencyFromMinutes(minutes: number): UrgencyLevel {
    if (minutes >= 30) return 'critical';
    if (minutes >= 15) return 'warning';
    return 'normal';
}

const URGENCY_TIME_CLASSES: Record<UrgencyLevel, string> = {
    normal: 'text-text-muted',
    warning: 'text-warning',
    critical: 'text-danger font-bold animate-kds-blink',
};

export function OrderTicketCard({
    orderNumber,
    orderType,
    tableNumber,
    waitMinutes,
    items,
    urgencyLevel,
    actionLabel,
    onAction,
    className = '',
}: OrderTicketCardProps) {
    const urgency = urgencyLevel ?? getUrgencyFromMinutes(waitMinutes);
    const cardClass = urgency === 'critical' ? 'card-urgent' : 'card-dark';

    return (
        <div className={`${cardClass} flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-text-inverse">
                        #{orderNumber}
                    </span>
                    {orderType && (
                        <span className="badge-pending text-[10px]">{orderType}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {tableNumber && (
                        <span className="text-sm text-text-muted font-mono">
                            T{tableNumber}
                        </span>
                    )}
                    <div className={`flex items-center gap-1 text-sm font-mono tabular-nums ${URGENCY_TIME_CLASSES[urgency]}`}>
                        {urgency === 'critical' && <AlertTriangle size={14} />}
                        <Clock size={14} />
                        <span>{waitMinutes}分</span>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="flex-1 px-3 py-2 space-y-1.5">
                {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 bg-surface-dark-3 text-text-inverse text-xs font-bold font-mono rounded-xs">
                            {item.quantity}
                        </span>
                        <div className="flex-1 min-w-0">
                            <span className={`text-sm text-text-inverse ${item.quantity > 1 ? 'font-bold' : ''}`}>
                                {item.name}
                            </span>
                            {item.notes && (
                                <div className="mt-0.5 pl-2 text-xs text-warning italic border-l-2 border-warning">
                                    {item.notes}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action */}
            <div className="px-3 pb-3 pt-1">
                <button
                    onClick={onAction}
                    className="w-full btn-action text-sm"
                    style={{ minHeight: '40px' }}
                >
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}
