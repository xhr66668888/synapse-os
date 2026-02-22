'use client';

import { useEffect, useRef, useCallback } from 'react';
import { audioManager } from './AudioManager';
import { useTerminal } from '@/lib/terminal-context';

export function useAudio() {
    const { terminal, isMuted } = useTerminal();
    const initializedRef = useRef(false);

    // Sync terminal type
    useEffect(() => {
        audioManager.setTerminal(terminal);
    }, [terminal]);

    // Sync mute state
    useEffect(() => {
        audioManager.setMuted(isMuted);
    }, [isMuted]);

    // Initialize on first user gesture
    useEffect(() => {
        if (initializedRef.current) return;

        const initOnGesture = async () => {
            await audioManager.initialize();
            initializedRef.current = true;
            document.removeEventListener('click', initOnGesture);
            document.removeEventListener('touchstart', initOnGesture);
        };

        document.addEventListener('click', initOnGesture, { once: true });
        document.addEventListener('touchstart', initOnGesture, { once: true });

        return () => {
            document.removeEventListener('click', initOnGesture);
            document.removeEventListener('touchstart', initOnGesture);
        };
    }, []);

    const playClick = useCallback(() => audioManager.playClick(), []);
    const playSuccess = useCallback(() => audioManager.playSuccess(), []);
    const playFailure = useCallback(() => audioManager.playFailure(), []);
    const playNewOrder = useCallback((count?: number) => audioManager.playNewOrder(count), []);
    const playKDSAlert = useCallback(
        (urgency: 'normal' | 'warning' | 'critical') => audioManager.playKDSAlert(urgency),
        []
    );
    const speak = useCallback((text: string, lang?: string) => audioManager.speak(text, lang), []);

    return {
        playClick,
        playSuccess,
        playFailure,
        playNewOrder,
        playKDSAlert,
        speak,
    };
}
