import type { TerminalType } from '@/lib/terminal-context';

export type AudioLevel = 'l1' | 'l2' | 'l3' | 'l4';

interface TerminalAudioConfig {
    l1Enabled: boolean;
    l2Enabled: boolean;
    l3Enabled: boolean;
    l4Enabled: boolean;
    l4Lang: string;
    maxVolume: number;
    urgencyEscalation?: boolean;
    l4Debounce?: number;
}

const TERMINAL_AUDIO_CONFIG: Record<TerminalType, TerminalAudioConfig> = {
    kiosk: {
        l1Enabled: true,
        l2Enabled: true,
        l3Enabled: false,
        l4Enabled: true,
        l4Lang: 'zh-CN',
        maxVolume: 0.6,
    },
    pos: {
        l1Enabled: true,
        l2Enabled: true,
        l3Enabled: false,
        l4Enabled: false,
        l4Lang: 'zh-CN',
        maxVolume: 0.4,
    },
    kds: {
        l1Enabled: false,
        l2Enabled: false,
        l3Enabled: true,
        l4Enabled: false,
        l4Lang: 'zh-CN',
        maxVolume: 1.0,
        urgencyEscalation: true,
    },
    admin: {
        l1Enabled: false,
        l2Enabled: true,
        l3Enabled: true,
        l4Enabled: true,
        l4Lang: 'zh-CN',
        maxVolume: 0.5,
        l4Debounce: 5000,
    },
    expo: {
        l1Enabled: false,
        l2Enabled: true,
        l3Enabled: true,
        l4Enabled: false,
        l4Lang: 'zh-CN',
        maxVolume: 0.6,
    },
    'pickup-screen': {
        l1Enabled: false,
        l2Enabled: false,
        l3Enabled: true,
        l4Enabled: true,
        l4Lang: 'zh-CN',
        maxVolume: 0.8,
    },
    'qr-order': {
        l1Enabled: true,
        l2Enabled: true,
        l3Enabled: false,
        l4Enabled: false,
        l4Lang: 'zh-CN',
        maxVolume: 0.4,
    },
};

class AudioManager {
    private audioContext: AudioContext | null = null;
    private isMuted = false;
    private activeChannels = 0;
    private readonly MAX_CHANNELS = 2;
    private debounceMap = new Map<string, { count: number; timer: ReturnType<typeof setTimeout> }>();
    private terminal: TerminalType = 'admin';
    private initialized = false;

    private get config(): TerminalAudioConfig {
        return TERMINAL_AUDIO_CONFIG[this.terminal];
    }

    async initialize(): Promise<void> {
        if (this.initialized && this.audioContext?.state === 'running') return;

        try {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.initialized = true;
        } catch {
            console.warn('AudioManager: Web Audio API not available');
        }
    }

    setTerminal(terminal: TerminalType): void {
        this.terminal = terminal;
    }

    setMuted(muted: boolean): void {
        this.isMuted = muted;
    }

    getIsMuted(): boolean {
        return this.isMuted;
    }

    // ========== L1: Physical Feedback (<100ms) ==========
    async playClick(): Promise<void> {
        if (!this.canPlay('l1')) return;
        const ctx = this.audioContext;
        if (!ctx) return;

        this.activeChannels++;
        try {
            const bufferSize = ctx.sampleRate * 0.008; // 8ms
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);

            // White noise through implicit bandpass (short burst = naturally filtered)
            for (let i = 0; i < bufferSize; i++) {
                const envelope = i < bufferSize * 0.1
                    ? i / (bufferSize * 0.1)           // 1ms attack
                    : 1 - (i / bufferSize);             // 7ms decay
                data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2000;
            filter.Q.value = 1.5;

            const gain = ctx.createGain();
            gain.gain.value = this.config.maxVolume * 0.3;

            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            source.start();
            source.onended = () => { this.activeChannels--; };
        } catch {
            this.activeChannels--;
        }
    }

    // ========== L2: Status Confirmation (~400ms) ==========
    async playSuccess(): Promise<void> {
        if (!this.canPlay('l2')) return;
        await this.playChord([523.25, 880], 0.4, true); // C5 + A5 (ascending major 6th)
    }

    async playFailure(): Promise<void> {
        if (!this.canPlay('l2')) return;
        await this.playChord([440, 415.3], 0.3, false); // A4 + Ab4 (descending minor 2nd)
    }

    private async playChord(frequencies: number[], duration: number, ascending: boolean): Promise<void> {
        const ctx = this.audioContext;
        if (!ctx) return;

        this.activeChannels++;
        try {
            const now = ctx.currentTime;
            const vol = this.config.maxVolume * 0.4;

            frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.value = freq;

                const gain = ctx.createGain();
                const startTime = ascending ? now + i * 0.08 : now;
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            });

            setTimeout(() => { this.activeChannels--; }, duration * 1000 + 100);
        } catch {
            this.activeChannels--;
        }
    }

    // ========== L3: Business Notification ==========
    async playNewOrder(count?: number): Promise<void> {
        if (!this.canPlay('l3')) return;

        if (count && count > 1) {
            await this.playChime(3);
            return;
        }

        // Use debounce for rapid incoming orders
        this.debounceOrPlay(
            'new_order',
            () => this.playChime(1),
            (batchCount) => {
                this.playChime(3);
                if (this.config.l4Enabled) {
                    this.speak(`您有 ${batchCount} 个新订单`);
                }
            }
        );
    }

    async playKDSAlert(urgencyLevel: 'normal' | 'warning' | 'critical'): Promise<void> {
        if (!this.canPlay('l3')) return;

        switch (urgencyLevel) {
            case 'normal':
                await this.playChime(1);
                break;
            case 'warning':
                await this.playChime(2);
                break;
            case 'critical':
                await this.playCriticalAlert();
                break;
        }
    }

    private async playChime(repeats: number): Promise<void> {
        const ctx = this.audioContext;
        if (!ctx) return;

        this.activeChannels++;
        try {
            const now = ctx.currentTime;
            const vol = this.config.maxVolume * 0.5;
            const notes = [659.25, 783.99, 987.77]; // E5, G5, B5 (major triad chime)

            for (let r = 0; r < repeats; r++) {
                const offset = r * 0.6;
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.value = freq;

                    const gain = ctx.createGain();
                    const t = now + offset + i * 0.12;
                    gain.gain.setValueAtTime(0, t);
                    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.4);
                });
            }

            setTimeout(() => { this.activeChannels--; }, repeats * 600 + 500);
        } catch {
            this.activeChannels--;
        }
    }

    private async playCriticalAlert(): Promise<void> {
        const ctx = this.audioContext;
        if (!ctx) return;

        this.activeChannels++;
        try {
            const now = ctx.currentTime;
            const vol = this.config.maxVolume * 0.8;

            for (let i = 0; i < 5; i++) {
                const osc = ctx.createOscillator();
                osc.type = 'square';
                osc.frequency.value = 1200;

                const gain = ctx.createGain();
                const t = now + i * 0.15;
                gain.gain.setValueAtTime(vol, t);
                gain.gain.setValueAtTime(0, t + 0.08);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(t);
                osc.stop(t + 0.08);
            }

            setTimeout(() => { this.activeChannels--; }, 1000);
        } catch {
            this.activeChannels--;
        }
    }

    // ========== L4: TTS Voice Guidance ==========
    async speak(text: string, lang?: string): Promise<void> {
        if (!this.canPlay('l4')) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang || this.config.l4Lang;
        utterance.rate = 0.9;
        utterance.volume = this.config.maxVolume;
        window.speechSynthesis.speak(utterance);
    }

    // ========== Internal Helpers ==========
    private canPlay(level: AudioLevel): boolean {
        if (this.isMuted) return false;
        if (!this.audioContext || this.audioContext.state !== 'running') return false;

        const enabledKey = `${level}Enabled` as keyof TerminalAudioConfig;
        if (!this.config[enabledKey]) return false;

        if (level !== 'l4' && this.activeChannels >= this.MAX_CHANNELS) return false;

        return true;
    }

    private debounceOrPlay(
        eventKey: string,
        playFn: () => void,
        batchFn: (count: number) => void,
    ): void {
        const existing = this.debounceMap.get(eventKey);
        if (existing) {
            existing.count++;
            clearTimeout(existing.timer);
        }
        const count = existing ? existing.count : 1;
        this.debounceMap.set(eventKey, {
            count,
            timer: setTimeout(() => {
                if (count >= 3) {
                    batchFn(count);
                } else {
                    playFn();
                }
                this.debounceMap.delete(eventKey);
            }, 1000),
        });
    }
}

// Singleton
export const audioManager = new AudioManager();
