import React, { useState } from 'react';
import { useMusicStore, formatDuration } from '../../stores/musicStore';
import './MusicPlayer.css';
import '../CssIcons.css';

const MusicPlayer: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const {
        isPlaying,
        currentTrack,
        playlist,
        toggle,
        volume,
        setVolume,
        nextTrack,
        prevTrack,
        selectTrack
    } = useMusicStore();

    // 如果没有歌曲在播放，显示空状态
    if (!currentTrack) {
        return (
            <div className="music-player">
                <div className="music-mini" onClick={() => setIsExpanded(true)}>
                    <div className="mini-art empty">
                        <span className="icon-css icon-play" style={{ transform: 'scale(0.8)', marginLeft: '2px' }}></span>
                    </div>
                    <div className="mini-info">
                        <div className="mini-title">未选曲目</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isExpanded) {
        return (
            <div className="music-player">
                <div className="music-mini" onClick={() => setIsExpanded(true)}>
                    <div className={`mini-art ${isPlaying ? 'playing' : ''}`}>
                        <img src="/assets/icon-music.png" alt="Music" style={{ width: '20px', height: '20px' }} />
                    </div>
                    <div className="mini-info">
                        <div className="mini-title">{currentTrack.title}</div>
                        <div className="mini-artist">{currentTrack.artist}</div>
                    </div>
                    <button className="mini-btn" onClick={(e) => { e.stopPropagation(); toggle(); }}>
                        <span className={`icon-css ${isPlaying ? 'icon-pause' : 'icon-play'}`} style={isPlaying ? {} : { marginLeft: '2px' }}></span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="music-player">
            <div className="music-expanded">
                <div className="expanded-header">
                    <h3>背景音乐</h3>
                    <button className="collapse-btn" onClick={() => setIsExpanded(false)}>
                        <span className="icon-css icon-close" style={{ transform: 'scale(0.7)' }}></span>
                    </button>
                </div>

                <div className="now-playing">
                    <div className="album-art">
                        <img src="/assets/icon-music.png" alt="Music" style={{ width: '60px', opacity: 0.5 }} />
                    </div>
                    <div className="track-title">{currentTrack.title}</div>
                    <div className="track-artist">{currentTrack.artist}</div>
                </div>

                <div className="player-controls">
                    <button className="control-btn" onClick={prevTrack}>
                        <span className="icon-css icon-prev"></span>
                    </button>
                    <button className={`control-btn play ${isPlaying ? 'active' : ''}`} onClick={toggle}>
                        <span className={`icon-css ${isPlaying ? 'icon-pause' : 'icon-play'}`} style={isPlaying ? {} : { marginLeft: '4px' }}></span>
                    </button>
                    <button className="control-btn" onClick={nextTrack}>
                        <span className="icon-css icon-next"></span>
                    </button>
                </div>

                <div className="volume-control">
                    <img src="/assets/icon-settings-new.png" alt="Vol" style={{ width: '14px', opacity: 0.5 }} />
                    <input
                        type="range"
                        min="0" max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                    />
                </div>

                <div className="playlist">
                    <div className="playlist-title">播放列表</div>
                    {playlist.map((track, index) => (
                        <div
                            key={track.id}
                            className={`playlist-item ${currentTrack.id === track.id ? 'active' : ''}`}
                            onClick={() => selectTrack(index)}
                        >
                            <div className="playlist-item-art">
                                <img src="/assets/icon-music.png" alt="Cover" style={{ width: '20px', opacity: 0.6 }} />
                            </div>
                            <div className="playlist-item-info">
                                <div className="playlist-item-title">{track.title}</div>
                                <div className="playlist-item-duration">{formatDuration(track.duration)}</div>
                            </div>
                            {currentTrack.id === track.id && isPlaying && (
                                <div className="playing-indicator">
                                    <span className="bar"></span>
                                    <span className="bar"></span>
                                    <span className="bar"></span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;
