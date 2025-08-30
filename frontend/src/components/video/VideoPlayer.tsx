'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  Settings
} from 'lucide-react';
import { VideoWithInteraction } from '../../types/video';
import { formatDuration } from '../../utils/formatters';

interface VideoPlayerProps {
  video: VideoWithInteraction;
  autoplay?: boolean;
}

export default function VideoPlayer({ video, autoplay = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const controlsTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setLoading(false);
      setDuration(video.duration);
      // Ensure audio is enabled and at full volume
      video.volume = 1;
      video.muted = false;
      setVolume(1);
      setIsMuted(false);
      if (autoplay) {
        // Try to play with sound first
        video.play().catch(() => {
          // If autoplay with sound fails, try muted autoplay
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => setError(true));
        });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setError(true);
      setLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [autoplay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => setError(true));
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseMove = () => {
    showControlsTemporarily();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    e.preventDefault();
    switch (e.code) {
      case 'Space':
        togglePlay();
        break;
      case 'ArrowLeft':
        skipTime(-10);
        break;
      case 'ArrowRight':
        skipTime(10);
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'ArrowUp':
        handleVolumeChange({ target: { value: Math.min(1, volume + 0.1).toString() } } as any);
        break;
      case 'ArrowDown':
        handleVolumeChange({ target: { value: Math.max(0, volume - 0.1).toString() } } as any);
        break;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [volume, isPlaying, currentTime, duration]);

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-xl mb-2">Error loading video</div>
          <div className="text-gray-400">Please try again later</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black group focus:outline-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
        muted={false}
        controls={false}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && !loading && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 bg-black bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-90 transition-opacity">
            <Play size={32} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
        showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="w-full h-2 bg-gray-600 rounded-full mb-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-red-600 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => skipTime(-10)}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label="Skip back 10 seconds"
            >
              <SkipBack size={24} />
            </button>

            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>

            <button
              onClick={() => skipTime(10)}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward size={24} />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div className="text-white text-sm">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              className="text-white hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <Settings size={24} />
            </button>

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}