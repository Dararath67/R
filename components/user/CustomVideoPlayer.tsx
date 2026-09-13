'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Subtitles,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SubtitleOption {
  id: string;
  label: string;
  lang: string;
  src?: string;
}

interface CustomVideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  subtitles?: SubtitleOption[];
  initialTime?: number;
  savedTime?: number;
  onNextEpisode?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

// Check if URL is YouTube
export const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&enablejsapi=1` : '';
};

export const getFormattedVideoUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  if (rawUrl.includes('/uploads/')) {
    const uploadPath = rawUrl.substring(rawUrl.indexOf('/uploads/'));
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      return uploadPath;
    }
    return `http://us.apsara.lol:15511${uploadPath}`;
  }
  return rawUrl;
};

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  poster,
  title,
  subtitles = [],
  initialTime = 0,
  savedTime = 0,
  onNextEpisode,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activeSrc, setActiveSrc] = useState<string>(() => getFormattedVideoUrl(src));
  const [doubleTapOverlay, setDoubleTapOverlay] = useState<{ type: 'rewind' | 'forward'; id: number } | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  const youtubeEmbedUrl = getYouTubeEmbedUrl(activeSrc);
  const isYouTube = !!youtubeEmbedUrl;

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handlePlayerTouchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isYouTube || !videoRef.current || !playerContainerRef.current) return;
    const now = Date.now();
    const rect = playerContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const timeDiff = now - lastTapRef.current.time;

    if (timeDiff < 320 && timeDiff > 0) {
      if (clickX < width * 0.4) {
        // Double tap LEFT -> Rewind 10s
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
        setDoubleTapOverlay({ type: 'rewind', id: now });
        setTimeout(() => setDoubleTapOverlay(null), 700);
      } else if (clickX > width * 0.6) {
        // Double tap RIGHT -> Fast Forward 10s
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
        setDoubleTapOverlay({ type: 'forward', id: now });
        setTimeout(() => setDoubleTapOverlay(null), 700);
      } else {
        togglePlay();
      }
    } else {
      setShowControls((prev) => !prev);
    }
    lastTapRef.current = { time: now, x: clickX };
  };

  useEffect(() => {
    const formatted = getFormattedVideoUrl(src);
    setActiveSrc(formatted);
    setVideoError(false);
    if (videoRef.current && !youtubeEmbedUrl) {
      videoRef.current.src = formatted;
      videoRef.current.load();
    }
  }, [src]);

  useEffect(() => {
    const startTime = savedTime || initialTime;
    if (videoRef.current && startTime > 0 && !isYouTube) {
      try {
        videoRef.current.currentTime = startTime;
      } catch (err) {
        console.warn('Could not set initial video time:', err);
      }
    }
  }, [initialTime, savedTime, isYouTube]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const togglePlay = () => {
    if (isYouTube || !videoRef.current) return;

    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error('Video play promise rejected:', err);
            setIsPlaying(false);
          });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 0;
    setDuration(dur);
    setVideoError(false);

    const startTime = savedTime || initialTime;
    if (startTime > 0 && startTime < dur) {
      videoRef.current.currentTime = startTime;
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) {
      onTimeUpdate(cur, dur);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTime = Number(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const val = Number(e.target.value);
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const handleVideoError = () => {
    console.warn('Video failed to load source:', activeSrc);
    setVideoError(true);
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || !isFinite(timeInSec)) return '00:00';
    const minutes = Math.floor(timeInSec / 60);
    const seconds = Math.floor(timeInSec % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSkipIntro = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 85, duration);
  };

  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Global Keyboard Shortcuts for Video Player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in input/textarea fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
      } else if (e.code === 'KeyN' && onNextEpisode) {
        e.preventDefault();
        onNextEpisode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, isMuted, onNextEpisode]);

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onClick={handlePlayerTouchClick}
      className="relative aspect-video w-full bg-slate-950 rounded-3xl overflow-hidden shadow-2xl group border border-slate-800 flex items-center justify-center select-none cursor-pointer"
    >
      {/* Mobile Double-Tap Ripple Overlay Indicators */}
      {doubleTapOverlay && (
        <div
          className={`absolute z-40 top-0 bottom-0 ${
            doubleTapOverlay.type === 'rewind' ? 'left-0 w-1/2 rounded-r-full' : 'right-0 w-1/2 rounded-l-full'
          } bg-brand-red/20 backdrop-blur-sm flex flex-col items-center justify-center animate-pulse transition-all`}
        >
          <div className="p-4 rounded-full bg-brand-red/40 text-white flex flex-col items-center space-y-1 shadow-2xl border border-white/20">
            <RotateCcw className={`w-8 h-8 ${doubleTapOverlay.type === 'forward' ? 'transform rotate-180' : ''}`} />
            <span className="text-xs font-black tracking-wider">
              {doubleTapOverlay.type === 'rewind' ? '-10s' : '+10s'}
            </span>
          </div>
        </div>
      )}

      {isYouTube ? (
        <iframe
          src={youtubeEmbedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <>
          <video
            ref={videoRef}
            src={activeSrc}
            poster={poster}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onNextEpisode) onNextEpisode();
            }}
            onError={handleVideoError}
            className="w-full h-full object-contain bg-slate-950"
          />

          {/* Skip Intro Button Overlay */}
          {isPlaying && currentTime > 0 && currentTime < 120 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSkipIntro();
              }}
              className="absolute left-6 bottom-20 z-30 bg-slate-900/90 hover:bg-brand-red text-white text-xs font-black px-4 py-2 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md transition-all flex items-center space-x-2 animate-fade-in"
            >
              <RotateCcw className="w-4 h-4 transform rotate-180" />
              <span>រំលងផ្ដើមរឿង (Skip Intro 85s)</span>
            </button>
          )}

          {/* Active Subtitle Text Box Overlay */}
          {selectedSubtitle !== 'off' && isPlaying && (
            <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none z-20">
              <span className="inline-block bg-black/80 text-amber-300 font-extrabold text-sm sm:text-base px-4 py-1.5 rounded-xl border border-amber-500/30 shadow-lg backdrop-blur-sm">
                [{selectedSubtitle.toUpperCase()}] {title}
              </span>
            </div>
          )}

          {/* Fallback Error Overlay */}
          {videoError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-4 z-30">
              <AlertCircle className="w-12 h-12 text-brand-red animate-bounce" />
              <p className="text-white font-bold text-sm">មិនអាចលេងតំណភ្ជាប់វីដេអូដើមបានទេ។ (Video Source Error)</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoError(false);
                    const formatted = getFormattedVideoUrl(src);
                    setActiveSrc(formatted);
                    if (videoRef.current) {
                      videoRef.current.src = formatted;
                      videoRef.current.load();
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="px-6 py-2.5 bg-brand-red hover:bg-red-700 text-white text-xs font-extrabold rounded-xl flex items-center space-x-2 shadow-lg transition hover:scale-105"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>ព្យាយាមលេងវីដេអូដើមម្ដងទៀត (Retry Video)</span>
                </button>
              </div>
            </div>
          )}

          {/* Center Play Button Overlay */}
          {!isPlaying && !videoError && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-brand-red/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-200 z-20"
            >
              <Play className="w-8 h-8 fill-white ml-1" />
            </button>
          )}

          {/* Top Overlay Bar */}
          <div
            className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-md">{title}</h2>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {selectedQuality} • {playbackSpeed}x • {selectedSubtitle === 'off' ? 'Subtitles Off' : selectedSubtitle.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-3 transition-opacity duration-300 z-20 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar */}
            <div className="relative flex items-center w-full">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-brand-red focus:outline-none"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center space-x-3">
                <button onClick={togglePlay} className="p-1.5 hover:text-brand-red transition-colors" title="Play/Pause (Space)">
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>

                <div className="flex items-center space-x-1.5 group/vol">
                  <button onClick={toggleMute} className="p-1.5 hover:text-brand-red transition-colors" title="Mute (M)">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <span className="text-[11px] font-bold text-slate-300 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-3 relative">
                {/* PiP Button */}
                <button
                  onClick={handlePiP}
                  className="p-1.5 hover:text-brand-red transition-colors rounded-full hover:bg-white/10"
                  title="Picture-in-Picture Mode"
                >
                  <RotateCcw className="w-4 h-4 transform -rotate-90" />
                </button>

                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="p-1.5 hover:text-brand-red transition-colors rounded-full hover:bg-white/10"
                  title="ការកំណត់ Video Player"
                >
                  <Settings className="w-5 h-5" />
                </button>

                <button onClick={toggleFullscreen} className="p-1.5 hover:text-brand-red transition-colors" title="Fullscreen (F)">
                  <Maximize className="w-5 h-5" />
                </button>

                {/* Settings Popup Menu */}
                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-10 w-60 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 space-y-3 text-xs z-50 text-white">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                        <Subtitles className="w-3.5 h-3.5 text-brand-red" />
                        <span>អត្ថបទរត់ពីក្រោម (Subtitles)</span>
                      </span>
                      <div className="grid grid-cols-3 gap-1 text-[11px]">
                        <button
                          onClick={() => setSelectedSubtitle('off')}
                          className={`px-2 py-1 rounded-lg font-bold border ${
                            selectedSubtitle === 'off'
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          Off
                        </button>
                        <button
                          onClick={() => setSelectedSubtitle('km')}
                          className={`px-2 py-1 rounded-lg font-bold border ${
                            selectedSubtitle === 'km'
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          ភាសាខ្មែរ
                        </button>
                        <button
                          onClick={() => setSelectedSubtitle('en')}
                          className={`px-2 py-1 rounded-lg font-bold border ${
                            selectedSubtitle === 'en'
                              ? 'bg-brand-red border-brand-red text-white'
                              : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-800 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        ល្បឿនវីដេអូ (Playback Speed)
                      </span>
                      <div className="flex items-center space-x-1 text-[11px]">
                        {[0.5, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            className={`flex-1 py-1 rounded-lg font-bold border ${
                              playbackSpeed === spd
                                ? 'bg-brand-red border-brand-red text-white'
                                : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-slate-800 pt-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        កម្រិតរូបភាព (Quality)
                      </span>
                      <div className="space-y-1 text-[11px]">
                        {['2160p', '1080p', '720p', '480p'].map((q) => (
                          <button
                            key={q}
                            onClick={() => setSelectedQuality(q)}
                            className={`w-full text-left px-2.5 py-1 rounded-lg font-bold flex items-center justify-between ${
                              selectedQuality === q ? 'bg-brand-red text-white' : 'text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            <span>{q === '2160p' ? '4K Ultra HD' : q === '1080p' ? 'Full HD 1080p' : q === '720p' ? 'HD 720p' : 'SD 480p'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
