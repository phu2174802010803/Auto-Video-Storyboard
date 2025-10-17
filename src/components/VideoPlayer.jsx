import { useState, useRef, useEffect } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ videoUrl, promptId, onCaptureFrame }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Debug logging
    useEffect(() => {
        console.log('[VideoPlayer] videoUrl:', videoUrl);
        console.log('[VideoPlayer] getVideoSrc():', getVideoSrc());
    }, [videoUrl]);

    // Convert local file path to local:// protocol for Electron
    const getVideoSrc = () => {
        if (!videoUrl) return '';
        if (!videoUrl.startsWith('http')) {
            // Try custom protocol first, fallback to file:// if needed
            return `local://${encodeURIComponent(videoUrl)}`;
        }
        return videoUrl;
    };

    // Fallback to file:// URL if custom protocol fails
    const getFallbackSrc = () => {
        if (!videoUrl) return '';
        if (!videoUrl.startsWith('http')) {
            return `file://${videoUrl}`;
        }
        return videoUrl;
    };

    // Handle video events
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setIsLoading(false);
            setHasError(false);
        };

        const handleError = (e) => {
            console.error('Video load error:', e);
            setIsLoading(false);
            setHasError(true);
            setErrorMessage('Không thể tải video. Vui lòng kiểm tra file.');

            // Try fallback URL if custom protocol failed
            if (video.src.includes('local://')) {
                console.log('Trying fallback URL...');
                video.src = getFallbackSrc();
                setIsLoading(true);
                setHasError(false);
            }
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);

        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('volumechange', handleVolumeChange);
        video.addEventListener('error', handleError);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('volumechange', handleVolumeChange);
            video.removeEventListener('error', handleError);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Control functions
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play();
        }
    };

    const skipTime = (seconds) => {
        const video = videoRef.current;
        if (!video) return;

        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    };


    const handleVolumeChange = (e) => {
        const video = videoRef.current;
        if (!video) return;

        const newVolume = parseFloat(e.target.value);
        video.volume = newVolume;
        video.muted = newVolume === 0;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !video.muted;
    };

    const toggleFullscreen = () => {
        const video = videoRef.current;
        if (!video) return;

        if (!isFullscreen) {
            if (video.requestFullscreen) {
                video.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const captureCurrentFrame = async () => {
        const video = videoRef.current;
        if (!video || !onCaptureFrame || !promptId) return;

        try {
            // Create canvas and capture current frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.drawImage(video, 0, 0);

            // Convert to base64
            const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Call the callback with frame data and prompt ID
            await onCaptureFrame(videoUrl, promptId);

            console.log('[VideoPlayer] ✅ Frame captured for prompt:', promptId);
        } catch (error) {
            console.error('[VideoPlayer] ❌ Error capturing frame:', error);
        }
    };

    const formatTime = (time) => {
        if (isNaN(time)) return '00:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-player-container">
            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    className="video-player"
                    preload="metadata"
                    onClick={togglePlay}
                    onMouseMove={() => setShowControls(true)}
                >
                    <source src={getVideoSrc()} type="video/mp4" />
                    Trình duyệt không hỗ trợ video MP4.
                </video>

                {isLoading && !hasError && (
                    <div className="video-loading">
                        <div className="loading-spinner"></div>
                        <p>Đang tải video...</p>
                    </div>
                )}

                {hasError && (
                    <div className="video-error">
                        <div className="error-icon">❌</div>
                        <p className="error-text">{errorMessage}</p>
                        <p className="error-details">File: {videoUrl.split('/').pop()}</p>
                    </div>
                )}

                <div className={`video-controls ${showControls ? 'show' : 'hide'}`}>
                    <div className="controls-row">
                        <div className="controls-left">
                            <button className="control-btn play-btn" onClick={togglePlay}>
                                {isPlaying ? '⏸️' : '▶️'}
                            </button>
                            <button className="control-btn skip-btn" onClick={() => skipTime(-10)}>
                                ⏪
                            </button>
                            <button className="control-btn skip-btn" onClick={() => skipTime(10)}>
                                ⏩
                            </button>
                            <div className="time-display">
                                <span>{formatTime(currentTime)}</span>
                                <span>/</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                        <div className="controls-right">
                            {onCaptureFrame && promptId && (
                                <button className="control-btn capture-btn" onClick={captureCurrentFrame} title="Chụp khung hình hiện tại">
                                    📷
                                </button>
                            )}
                            <div className="volume-control">
                                <button className="control-btn volume-btn" onClick={toggleMute}>
                                    {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                />
                            </div>
                            <button className="control-btn fullscreen-btn" onClick={toggleFullscreen}>
                                {isFullscreen ? '⤓' : '⤢'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
