'use client';

import { useState } from 'react';
import {
    Music,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Volume2,
    VolumeX,
    Shuffle,
    Repeat,
    ListMusic,
    Radio,
    Clock
} from 'lucide-react';

interface Track {
    id: string;
    title: string;
    artist: string;
    duration: string;
    category: 'ambient' | 'jazz' | 'classical' | 'lounge';
}

const playlist: Track[] = [
    { id: '1', title: '午后时光', artist: 'Ambient Studio', duration: '3:00', category: 'ambient' },
    { id: '2', title: 'Smooth Jazz Cafe', artist: 'Jazz Collective', duration: '4:00', category: 'jazz' },
    { id: '3', title: 'Classical Dinner', artist: 'Orchestra', duration: '5:00', category: 'classical' },
    { id: '4', title: 'Lounge Vibes', artist: 'Chill House', duration: '3:30', category: 'lounge' },
    { id: '5', title: 'Piano Dreams', artist: 'Solo Piano', duration: '4:20', category: 'classical' },
    { id: '6', title: 'Cafe Bossa Nova', artist: 'Brazilian Jazz', duration: '3:45', category: 'jazz' },
];

const schedules = [
    { time: '09:00 - 11:00', playlist: '早餐轻音乐', genre: 'ambient' },
    { time: '11:00 - 14:00', playlist: '午餐爵士乐', genre: 'jazz' },
    { time: '14:00 - 17:00', playlist: '下午茶古典', genre: 'classical' },
    { time: '17:00 - 21:00', playlist: '晚餐 Lounge', genre: 'lounge' },
    { time: '21:00 - 23:00', playlist: '深夜氛围', genre: 'ambient' },
];

export default function MusicPage() {
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTrack, setCurrentTrack] = useState(playlist[0]);
    const [volume, setVolume] = useState(60);
    const [isMuted, setIsMuted] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('all');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const categories = [
        { id: 'all', label: '全部' },
        { id: 'ambient', label: '环境音乐' },
        { id: 'jazz', label: '爵士' },
        { id: 'classical', label: '古典' },
        { id: 'lounge', label: 'Lounge' },
    ];

    const filteredPlaylist = activeCategory === 'all'
        ? playlist
        : playlist.filter(t => t.category === activeCategory);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                    <Music className="w-8 h-8 text-primary" />
                    背景音乐管理
                </h1>
                <p className="text-text-secondary mt-1">为您的餐厅营造完美氛围</p>
            </div>

            <div className="grid grid-cols-3 gap-8">
                {/* Now Playing */}
                <div className="col-span-2 space-y-6">
                    {/* Main Player */}
                    <div className="card p-8 bg-gradient-to-br from-primary/5 to-purple-50">
                        <div className="flex items-center gap-8">
                            {/* Album Art */}
                            <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl">
                                <Music className="w-16 h-16 text-white" />
                            </div>

                            {/* Track Info */}
                            <div className="flex-1">
                                <div className="text-sm text-text-muted mb-1">正在播放</div>
                                <h2 className="text-2xl font-bold text-text-primary">{currentTrack.title}</h2>
                                <p className="text-text-secondary">{currentTrack.artist}</p>

                                {/* Progress Bar */}
                                <div className="mt-6">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary rounded-full" style={{ width: '45%' }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-text-muted mt-1">
                                        <span>1:21</span>
                                        <span>{currentTrack.duration}</span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-4 mt-6">
                                    <button
                                        className={`p-2 rounded-lg transition-colors ${shuffle ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text-primary'}`}
                                        onClick={() => setShuffle(!shuffle)}
                                    >
                                        <Shuffle className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                                        <SkipBack className="w-6 h-6" />
                                    </button>
                                    <button
                                        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
                                        onClick={() => setIsPlaying(!isPlaying)}
                                    >
                                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                                    </button>
                                    <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                    <button
                                        className={`p-2 rounded-lg transition-colors ${repeat !== 'none' ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text-primary'}`}
                                        onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
                                    >
                                        <Repeat className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Volume */}
                            <div className="flex flex-col items-center gap-2">
                                <button
                                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                                    onClick={() => setIsMuted(!isMuted)}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => setVolume(Number(e.target.value))}
                                    className="w-24 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                                    style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100px', width: '8px' }}
                                />
                                <span className="text-xs text-text-muted">{volume}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Playlist */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                <ListMusic className="w-5 h-5" /> 播放列表
                            </h3>
                            <div className="flex gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${activeCategory === cat.id
                                                ? 'bg-primary text-white'
                                                : 'text-text-secondary hover:bg-bg-hover'
                                            }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {filteredPlaylist.map((track) => (
                                <div
                                    key={track.id}
                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${currentTrack.id === track.id
                                            ? 'bg-primary/10 border border-primary/20'
                                            : 'hover:bg-bg-hover'
                                        }`}
                                    onClick={() => setCurrentTrack(track)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentTrack.id === track.id ? 'bg-primary text-white' : 'bg-bg-secondary'
                                            }`}>
                                            {currentTrack.id === track.id && isPlaying ? (
                                                <div className="flex items-center gap-0.5">
                                                    <span className="w-1 h-3 bg-white rounded-full animate-pulse"></span>
                                                    <span className="w-1 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                                                    <span className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                                </div>
                                            ) : (
                                                <Music className="w-4 h-4 text-text-muted" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium text-text-primary">{track.title}</div>
                                            <div className="text-sm text-text-muted">{track.artist}</div>
                                        </div>
                                    </div>
                                    <span className="text-sm text-text-muted">{track.duration}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Schedule */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5" /> 定时播放
                        </h3>
                        <div className="space-y-3">
                            {schedules.map((schedule, index) => (
                                <div
                                    key={index}
                                    className="p-3 rounded-xl bg-bg-secondary/50 hover:bg-bg-hover transition-colors"
                                >
                                    <div className="text-sm font-medium text-text-primary">{schedule.time}</div>
                                    <div className="text-xs text-text-muted">{schedule.playlist}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Radio */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-4">
                            <Radio className="w-5 h-5" /> 快速电台
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 text-green-700 font-medium hover:scale-105 transition-transform">
                                轻松氛围
                            </button>
                            <button className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 font-medium hover:scale-105 transition-transform">
                                爵士时光
                            </button>
                            <button className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 font-medium hover:scale-105 transition-transform">
                                古典优雅
                            </button>
                            <button className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 font-medium hover:scale-105 transition-transform">
                                用餐时刻
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
