'use client';

import { X } from 'lucide-react';

interface BulkAction {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface BulkActionBarProps {
    selectedCount: number;
    actions: BulkAction[];
    onClearSelection: () => void;
    className?: string;
}

export function BulkActionBar({ selectedCount, actions, onClearSelection, className = '' }: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className={`flex items-center gap-3 px-4 py-2 bg-action text-action-fg rounded-sm animate-fade-in ${className}`}>
            <span className="text-sm font-bold tabular-nums">
                已选 {selectedCount} 项
            </span>
            <div className="flex items-center gap-2 ml-4">
                {actions.map((action) => (
                    <button
                        key={action.label}
                        onClick={action.onClick}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xs transition-colors ${
                            action.variant === 'danger'
                                ? 'bg-danger text-danger-fg'
                                : 'bg-surface-dark-3 text-text-inverse hover:bg-surface-dark-2'
                        }`}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
            <button
                onClick={onClearSelection}
                className="ml-auto p-1 hover:bg-surface-dark-3 rounded-xs transition-colors"
                aria-label="清除选择"
            >
                <X size={16} />
            </button>
        </div>
    );
}
