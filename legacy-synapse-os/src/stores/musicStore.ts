import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 音乐曲目
export interface Track {
    id: string;
    title: string;
    artist: string;
    duration: number;  // 秒
    url: string;
    category: 'ambient' | 'jazz' | 'classical' | 'lounge';
}

// 播放器状态
interface MusicStore {
    // 状态
    isPlaying: boolean;
    currentTrack: Track | null;
    volume: number;  // 0-100
    playlist: Track[];
    currentIndex: number;
    shuffle: boolean;
    repeat: 'none' | 'one' | 'all';

    // 操作
    play: () => void;
    pause: () => void;
    toggle: () => void;
    setVolume: (volume: number) => void;
    nextTrack: () => void;
    prevTrack: () => void;
    selectTrack: (index: number) => void;
    setPlaylist: (tracks: Track[]) => void;
    toggleShuffle: () => void;
    setRepeat: (mode: 'none' | 'one' | 'all') => void;
}

// 默认播放列表（免版权音乐示例）
const defaultPlaylist: Track[] = [
    {
        id: '1',
        title: '午后时光',
        artist: 'Ambient Studio',
        duration: 180,
        url: '/music/afternoon.mp3',
        category: 'ambient',
    },
    {
        id: '2',
        title: 'Smooth Jazz Cafe',
        artist: 'Jazz Collective',
        duration: 240,
        url: '/music/smooth-jazz.mp3',
        category: 'jazz',
    },
    {
        id: '3',
        title: 'Classical Dinner',
        artist: 'Orchestra',
        duration: 300,
        url: '/music/classical.mp3',
        category: 'classical',
    },
    {
        id: '4',
        title: 'Lounge Vibes',
        artist: 'Chill House',
        duration: 210,
        url: '/music/lounge.mp3',
        category: 'lounge',
    },
];

export const useMusicStore = create<MusicStore>()(
    persist(
        (set, get) => ({
            isPlaying: false,
            currentTrack: null,
            volume: 50,
            playlist: defaultPlaylist,
            currentIndex: 0,
            shuffle: false,
            repeat: 'none',

            play: () => {
                const { playlist, currentIndex, currentTrack } = get();
                if (!currentTrack && playlist.length > 0) {
                    set({ currentTrack: playlist[currentIndex], isPlaying: true });
                } else {
                    set({ isPlaying: true });
                }
                console.log('🎵 [Music] Playing');
            },

            pause: () => {
                set({ isPlaying: false });
                console.log('🎵 [Music] Paused');
            },

            toggle: () => {
                const { isPlaying, play, pause } = get();
                if (isPlaying) pause();
                else play();
            },

            setVolume: (volume) => {
                set({ volume: Math.max(0, Math.min(100, volume)) });
            },

            nextTrack: () => {
                const { playlist, currentIndex, shuffle, repeat } = get();
                if (playlist.length === 0) return;

                let nextIndex: number;
                if (shuffle) {
                    nextIndex = Math.floor(Math.random() * playlist.length);
                } else if (currentIndex >= playlist.length - 1) {
                    nextIndex = repeat === 'all' ? 0 : currentIndex;
                } else {
                    nextIndex = currentIndex + 1;
                }

                set({
                    currentIndex: nextIndex,
                    currentTrack: playlist[nextIndex],
                });
                console.log('🎵 [Music] Next:', playlist[nextIndex].title);
            },

            prevTrack: () => {
                const { playlist, currentIndex } = get();
                if (playlist.length === 0) return;

                const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
                set({
                    currentIndex: prevIndex,
                    currentTrack: playlist[prevIndex],
                });
                console.log('🎵 [Music] Previous:', playlist[prevIndex].title);
            },

            selectTrack: (index) => {
                const { playlist } = get();
                if (index >= 0 && index < playlist.length) {
                    set({
                        currentIndex: index,
                        currentTrack: playlist[index],
                        isPlaying: true,
                    });
                }
            },

            setPlaylist: (tracks) => {
                set({
                    playlist: tracks,
                    currentIndex: 0,
                    currentTrack: tracks.length > 0 ? tracks[0] : null,
                });
            },

            toggleShuffle: () => {
                set(state => ({ shuffle: !state.shuffle }));
            },

            setRepeat: (mode) => {
                set({ repeat: mode });
            },
        }),
        {
            name: 'synapse-music-storage',
            partialize: (state) => ({
                volume: state.volume,
                shuffle: state.shuffle,
                repeat: state.repeat,
            }),
        }
    )
);

// 格式化时间
export const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
