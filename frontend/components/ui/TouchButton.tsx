'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TouchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'lg' | 'xl';
    label: string;
    sublabel?: string;
    icon?: ReactNode;
}

const VARIANT_CLASSES = {
    primary: 'bg-action text-action-fg',
    secondary: 'bg-surface-raised text-text-primary border border-border',
    danger: 'bg-danger text-danger-fg',
    success: 'bg-success text-success-fg',
};

export function TouchButton({
    variant = 'primary',
    size = 'lg',
    label,
    sublabel,
    icon,
    className = '',
    ...props
}: TouchButtonProps) {
    const minHeight = size === 'xl' ? 'min-h-[80px]' : 'min-h-[60px]';
    const textSize = size === 'xl' ? 'text-xl' : 'text-lg';

    return (
        <button
            className={`flex items-center justify-center gap-3 px-6 rounded-sm font-bold transition-colors duration-100 select-none
                ${VARIANT_CLASSES[variant]} ${minHeight} ${textSize}
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}`}
            {...props}
        >
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span className="flex flex-col items-center">
                <span>{label}</span>
                {sublabel && <span className="text-xs font-normal opacity-80">{sublabel}</span>}
            </span>
        </button>
    );
}
