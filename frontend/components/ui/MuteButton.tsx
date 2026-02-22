'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTerminal } from '@/lib/terminal-context';

interface MuteButtonProps {
    size?: 'sm' | 'md';
    className?: string;
}

export function MuteButton({ size = 'md', className = '' }: MuteButtonProps) {
    const { isMuted, toggleMuted } = useTerminal();

    const iconSize = size === 'sm' ? 16 : 20;
    const btnSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';

    return (
        <button
            onClick={toggleMuted}
            className={`relative inline-flex items-center justify-center ${btnSize} rounded-sm transition-colors duration-100 ${
                isMuted
                    ? 'bg-danger text-danger-fg'
                    : 'bg-surface-dark-3 text-text-inverse hover:bg-surface-dark-2'
            } ${className}`}
            title={isMuted ? '取消静音' : '静音'}
            aria-label={isMuted ? '取消静音' : '静音'}
        >
            {isMuted ? (
                <VolumeX size={iconSize} />
            ) : (
                <Volume2 size={iconSize} />
            )}
        </button>
    );
}
