'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type TerminalType = 'admin' | 'pos' | 'kds' | 'kiosk' | 'qr-order' | 'pickup-screen' | 'expo';

interface TerminalContextValue {
    terminal: TerminalType;
    isMuted: boolean;
    setMuted: (muted: boolean) => void;
    toggleMuted: () => void;
}

const TerminalContext = createContext<TerminalContextValue>({
    terminal: 'admin',
    isMuted: false,
    setMuted: () => {},
    toggleMuted: () => {},
});

export function TerminalProvider({
    terminal,
    children,
}: {
    terminal: TerminalType;
    children: ReactNode;
}) {
    const [isMuted, setIsMuted] = useState(false);

    const setMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
    }, []);

    const toggleMuted = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    return (
        <TerminalContext.Provider value={{ terminal, isMuted, setMuted, toggleMuted }}>
            {children}
        </TerminalContext.Provider>
    );
}

export function useTerminal() {
    return useContext(TerminalContext);
}
