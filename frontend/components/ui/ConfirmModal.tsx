'use client';

import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmLabel = '确认',
    cancelLabel = '取消',
    variant = 'default',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

            {/* Modal */}
            <div className="relative bg-surface-raised rounded-md shadow-raised w-full max-w-md mx-4 animate-fade-in" style={{ border: '1px solid var(--border-default)' }}>
                <div className="p-6">
                    {variant === 'danger' && (
                        <div className="flex items-center justify-center w-12 h-12 mb-4 bg-danger-bg rounded-sm">
                            <AlertTriangle size={24} className="text-danger" />
                        </div>
                    )}
                    <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
                    <p className="text-sm text-text-secondary">{message}</p>
                </div>

                {/* 按钮：取消左下，确认右下，保持物理距离防误触 */}
                <div className="flex items-center justify-between px-6 pb-6">
                    <button
                        onClick={onCancel}
                        className="btn-ghost"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={variant === 'danger' ? 'btn-danger' : 'btn-action'}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
