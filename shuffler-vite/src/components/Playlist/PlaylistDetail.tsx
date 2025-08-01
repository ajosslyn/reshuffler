import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    fetchPlaylistDetails,
    fetchPlaylistTracks,
    playTrackOnDevice,
    transferPlaybackToDevice,
    playPlaylistOnDevice
} from '../../api/spotify';
import ImageWithFallback from '../common/ImageWithFallback';
import './PlaylistDetail.css'; // Import CSS from same directory


interface Track {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
        name: string;
        images?: Array<{ url: string }>;
    };
    duration_ms: number;
    preview_url?: string;
}

const PlaylistDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [playlist, setPlaylist] = useState<any>(null);
    const [tracks, setTracks] = useState<Array<{ track: Track }>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Playback states
    const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [shuffledTracks, setShuffledTracks] = useState<Array<{ track: Track }>>([]);
    const [isShuffled, setIsShuffled] = useState<boolean>(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [lastTapTime, setLastTapTime] = useState<number>(0);

    // Add Spotify SDK related state
    const [player, setPlayer] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [isDeviceReady, setIsDeviceReady] = useState<boolean>(false);

    // Add these state variables
    const [currentProgress, setCurrentProgress] = useState(0);
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
    const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    // Helper function for formatting duration
    const formatDuration = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
    };

    // Add time formatting function
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Add progress bar click handler - MOVED HERE TO COMPLY WITH HOOKS RULES
    const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPremium || !deviceId || !currentlyPlayingTrack) return;
        
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progressWidth = rect.width;
        const clickPercent = clickX / progressWidth;
        
        // Get the current track duration
        const currentTrack = tracks.find(item => item.track.id === currentlyPlayingTrack);
        if (currentTrack) {
            const targetPosition = Math.floor((clickPercent * currentTrack.track.duration_ms) / 1000) * 1000;
            
            // Seek to the position using Spotify Web API
            fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${targetPosition}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            .then(response => {
                if (response.ok) {
                    setCurrentProgress(clickPercent * 100);
                    setCurrentPlaybackTime(targetPosition / 1000);
                }
            })
            .catch(err => console.error('Error seeking:', err));
        }
    }, [isPremium, deviceId, currentlyPlayingTrack, tracks]);

    // ALL CALLBACK HOOKS - MOVED HERE TO COMPLY WITH HOOKS RULES
    const handlePlaybackError = useCallback((err: any) => {
        console.error("Error playing track:", err);

        // Check if error is related to device registration
        if (err.message && (
            err.message.includes('device is not registered') ||
            err.message.includes('device_not_found')
        )) {
            setIsDeviceReady(false);
            alert("Playback device disconnected. Please return to the home screen to reconnect.");
        } else {
            alert("Failed to play track with Spotify Premium. Falling back to preview mode.");
            setIsPremium(false);
        }
    }, []);

    // Add this fallbackToPreview helper function
    const fallbackToPreview = useCallback((track: Track) => {
        if (track.preview_url) {
            if (audioRef.current) {
                audioRef.current.src = track.preview_url;
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        setCurrentlyPlayingTrack(track.id);
                    })
                    .catch(err => {
                        console.error("Error playing preview:", err);
                        alert("Could not play audio preview. This may be due to browser autoplay restrictions.");
                    });
            }
        } else {
            alert("No preview available for this track.");
        }
    }, []);

    const handlePlayTrack = useCallback((track: Track) => {
        // Add debug logging
        console.log("Track clicked - Details:", {
            trackId: track.id,
            currentTrack: currentlyPlayingTrack,
            isPremium,
            deviceId,
            isDeviceReady,
            hasPlayer: !!player,
            previewUrl: track.preview_url
        });
        
        if (isPremium && deviceId && isDeviceReady) {
            // First try to connect if needed
            if (player && !isDeviceReady) {
                console.log("Device not ready, connecting first...");
                player.connect().then((success: boolean) => {
                    if (success) {
                        setTimeout(() => {
                            playTrackOnDevice(`spotify:track:${track.id}`, deviceId)
                                .then(() => {
                                    setIsPlaying(true);
                                    setCurrentlyPlayingTrack(track.id);
                                })
                                .catch(err => {
                                    console.error("Error playing track after reconnect:", err);
                                    fallbackToPreview(track);
                                });
                        }, 1000);
                    } else {
                        fallbackToPreview(track);
                    }
                });
                return;
            }
            
            // Direct play if device is ready
            playTrackOnDevice(`spotify:track:${track.id}`, deviceId)
                .then(() => {
                    setIsPlaying(true);
                    setCurrentlyPlayingTrack(track.id);
                })
                .catch(err => {
                    console.error("Error playing track:", err);
                    fallbackToPreview(track);
                });
        } else {
            // Preview mode logic (unchanged)
            if (!track.preview_url) {
                console.log("No preview available for this track");
                alert("No preview available for this track. Full playback requires Spotify Premium.");
                return;
            }

            if (currentlyPlayingTrack === track.id) {
                if (isPlaying) {
                    audioRef.current?.pause();
                } else {
                    audioRef.current?.play();
                }
                setIsPlaying(!isPlaying);
            } else {
                if (audioRef.current) {
                    audioRef.current.src = track.preview_url || '';
                    audioRef.current.play()
                        .then(() => {
                            setIsPlaying(true);
                            setCurrentlyPlayingTrack(track.id);
                        })
                        .catch(err => {
                            console.error("Error playing track:", err);
                            alert("Failed to play track preview. This may be due to browser autoplay restrictions.");
                        });
                }
            }
        }
    }, [audioRef, currentlyPlayingTrack, isPlaying, isPremium, deviceId, isDeviceReady, player, fallbackToPreview]);

    // Handle track ended
    const handleTrackEnded = useCallback(() => {
        const currentTrackIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);

        if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length - 1) {
            // Play next track
            const nextTrack = tracks[currentTrackIndex + 1].track;
            handlePlayTrack(nextTrack);
        } else {
            // End of playlist
            setIsPlaying(false);
            setCurrentlyPlayingTrack(null);
        }
    }, [currentlyPlayingTrack, tracks, handlePlayTrack]);

    // Replace your handleNextTrack function with this improved version
    const handleNextTrack = useCallback(() => {
        if (isPremium && deviceId && isDeviceReady) {
            // First, determine the next track index
            const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
            const nextIndex = currentIndex + 1;

            if (nextIndex < tracks.length) {
                console.log(`Playing next track: ${tracks[nextIndex].track.name}`);

                // Play with context to maintain position in playlist
                fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        context_uri: `spotify:playlist:${id}`,
                        offset: { position: nextIndex }
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => Promise.reject(err));
                        }
                        // Update current track for immediate UI feedback
                        setCurrentlyPlayingTrack(tracks[nextIndex].track.id);
                    })
                    .catch(err => {
                        console.error('Error playing next track:', err);

                        // Fall back to direct track method
                        playTrackOnDevice(`spotify:track:${tracks[nextIndex].track.id}`, deviceId)
                            .then(() => {
                                setCurrentlyPlayingTrack(tracks[nextIndex].track.id);
                            })
                            .catch(handlePlaybackError);
                    });
            }
        } else {
            // Non-premium preview mode (your existing code)
            const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
            if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
                const nextTrack = tracks[currentIndex + 1].track;
                handlePlayTrack(nextTrack);
            }
        }
    }, [isPremium, deviceId, isDeviceReady, currentlyPlayingTrack, tracks, id, handlePlayTrack, handlePlaybackError]);

    // Replace your handlePreviousTrack function with this improved version
    const handlePreviousTrack = useCallback(() => {
        if (isPremium && deviceId && isDeviceReady) {
            // First, determine the previous track index
            const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
            const prevIndex = currentIndex - 1;

            if (prevIndex >= 0) {
                console.log(`Playing previous track: ${tracks[prevIndex].track.name}`);

                // Play with context to maintain position in playlist
                fetch('https://api.spotify.com/v1/me/player/play', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        context_uri: `spotify:playlist:${id}`,
                        offset: { position: prevIndex }
                    })
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => Promise.reject(err));
                        }
                        // Update current track for immediate UI feedback
                        setCurrentlyPlayingTrack(tracks[prevIndex].track.id);
                    })
                    .catch(err => {
                        console.error('Error playing previous track:', err);

                        // Fall back to direct track method
                        playTrackOnDevice(`spotify:track:${tracks[prevIndex].track.id}`, deviceId)
                            .then(() => {
                                setCurrentlyPlayingTrack(tracks[prevIndex].track.id);
                            })
                            .catch(handlePlaybackError);
                    });
            }
        } else {
            // Non-premium preview mode
            const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
            if (currentIndex >= 0 && currentIndex > 0) {
                const prevTrack = tracks[currentIndex - 1].track;
                handlePlayTrack(prevTrack);
            }
        }
    }, [isPremium, deviceId, isDeviceReady, currentlyPlayingTrack, tracks, id, handlePlayTrack, handlePlaybackError]);

    // Add handlePlayPauseClick function
    const handlePlayPauseClick = useCallback(() => {
        if (isPremium && deviceId && isDeviceReady) {
            // Use Spotify Web API to control playback
            const action = isPlaying ? 'pause' : 'play';
            fetch(`https://api.spotify.com/v1/me/player/${action}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
                .then(response => {
                    if (response.ok) {
                        setIsPlaying(!isPlaying);
                    }
                })
                .catch(err => {
                    console.error('Error controlling playback:', err);
                    handlePlaybackError(err);
                });
        } else {
            // Preview mode - use audioRef
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
            }
        }
    }, [isPremium, deviceId, isDeviceReady, isPlaying, handlePlaybackError]);

    // Handle audio errors
    const handleAudioError = useCallback((e: Event) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        alert("Error playing track. The preview may not be available.");
    }, [setIsPlaying]);

    // Update handleMainPlayButtonClick to use playPlaylistOnDevice
    const handleMainPlayButtonClick = useCallback(() => {
        if (tracks.length === 0) return;

        if (isPremium && deviceId && isDeviceReady && id) {
            // Play the entire playlist using SDK
            console.log('Using SDK to play entire playlist');

            playPlaylistOnDevice(`spotify:playlist:${id}`, deviceId, 0)
                .then(() => {
                    setIsPlaying(true);
                    setCurrentlyPlayingTrack(tracks[0].track.id);
                })
                .catch(err => {
                    handlePlaybackError(err);

                    // Fall back to playing first track with preview URL
                    if (tracks[0].track.preview_url) {
                        handlePlayTrack(tracks[0].track);
                    } else {
                        alert("No preview available for the first track.");
                    }
                });
        } else {
            // Existing preview playback code
            if (!currentlyPlayingTrack) {
                // Start playing first track
                handlePlayTrack(tracks[0].track);
            } else {
                // Toggle play/pause
                if (isPlaying) {
                    audioRef.current?.pause();
                } else {
                    audioRef.current?.play();
                }
                setIsPlaying(!isPlaying);
            }
        }
    }, [currentlyPlayingTrack, isPlaying, tracks, handlePlayTrack, isPremium, deviceId, isDeviceReady, id, handlePlaybackError]);

    // Handle shuffle
    const toggleShuffle = useCallback(() => {
        if (isShuffled) {
            setIsShuffled(false);
        } else {
            // Create shuffled copy of tracks
            const shuffled = [...tracks].sort(() => Math.random() - 0.5);
            setShuffledTracks(shuffled);
            setIsShuffled(true);
        }
    }, [tracks, isShuffled]);

    // Handle double tap for mobile
    const handleTrackTap = useCallback((track: Track, event: React.TouchEvent) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;

        if (tapLength < 300 && tapLength > 0) {
            // Double tap detected
            handlePlayTrack(track);
            event.preventDefault();
        }

        setLastTapTime(currentTime);
    }, [lastTapTime, handlePlayTrack]);

    // Replace the existing handleBackClick function with this:
    const handleBackClick = useCallback(() => {
        // When going back, preserve our premium status by explicitly setting it
        if (isPremium) {
            localStorage.setItem('spotify_is_premium', 'true');
            localStorage.setItem('spotify_player_ready', isDeviceReady ? 'true' : 'false');
        }
        
        // Use navigate to dashboard to ensure a clean mount
        navigate('/dashboard', { 
            replace: true  // Replace the current history entry
        });
    }, [isPremium, isDeviceReady, navigate]);

    const reconnectSpotifyDevice = useCallback(async () => {
        console.log('Attempting to reconnect Spotify device...');

        // Check if player instance already exists from Dashboard
        const existingPlayer = player;
        
        if (existingPlayer) {
            console.log('Using existing player instance for reconnection');
            try {
                const success = await existingPlayer.connect();
                if (success) {
                    console.log('Successfully reconnected existing player');
                    setIsDeviceReady(true);
                    return true;
                } else {
                    console.error('Failed to reconnect existing player');
                    return false;
                }
            } catch (err) {
                console.error('Error reconnecting existing player:', err);
                return false;
            }
        }
        
        // Fall back to creating new player only if one doesn't exist already
        console.log('No existing player, creating new instance');
        
        // Check if Spotify SDK is available
        if (!window.Spotify || !window.Spotify.Player) {
            console.error('Spotify SDK not available');
            setIsPremium(false);
            return false;
        }

        // Get fresh access token
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error('No access token available');
            setIsPremium(false);
            return false;
        }

        try {
            // Create a new player instance
            const newPlayer = new window.Spotify.Player({
                name: 'Music Shuffler',
                getOAuthToken: (cb: (token: string) => void) => { cb(token); },
                volume: 0.5
            });

            // Connect and update state
            const success = await newPlayer.connect();
            if (success) {
                // Add listeners for state changes
                newPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
                    console.log('Device reconnected with ID:', device_id);
                    setDeviceId(device_id);
                    setPlayer(newPlayer);
                    setIsDeviceReady(true);

                    // Update localStorage to reflect reconnection
                    localStorage.setItem('spotify_device_id', device_id);
                    localStorage.setItem('spotify_player_ready', 'true');
                });

                return true;
            } else {
                console.error('Failed to connect new Spotify player');
                return false;
            }
        } catch (error) {
            console.error('Error reconnecting Spotify device:', error);
            return false;
        }
    }, [player]);

    // ALL USEEFFECT HOOKS HERE
    useEffect(() => {
        const loadPlaylistData = async () => {
            if (!id) return;

            setLoading(true);
            try {
                const playlistData = await fetchPlaylistDetails(id);
                setPlaylist(playlistData);

                const tracksData = await fetchPlaylistTracks(id);
                setTracks(tracksData.items || []);
            } catch (error) {
                console.error('Error loading playlist:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlaylistData();
    }, [id]);

    // Add Spotify Web Playback SDK initialization
    useEffect(() => {
        // Access the player from the Dashboard component if available
        const checkForPlayer = () => {
            if (window.Spotify && window.Spotify.Player) {
                // Player is already initialized by Dashboard
                console.log('Spotify SDK already initialized, checking for device');

                // Check localStorage for player info
                const existingDeviceId = localStorage.getItem('spotify_device_id');
                const isPremiumUser = localStorage.getItem('spotify_is_premium') === 'true';

                if (existingDeviceId) {
                    console.log('Found existing device ID:', existingDeviceId);
                    setDeviceId(existingDeviceId);
                    setIsPremium(isPremiumUser);
                    setIsDeviceReady(true);
                }
            }
        };

        // Check immediately and also after a short delay to ensure Dashboard has time to initialize
        checkForPlayer();
        const timer = setTimeout(checkForPlayer, 1000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isPremium || !deviceId) return;

        console.log('Setting up device keep-alive check (3-second interval)');

        // Keep-alive ping every 3 seconds (same as Dashboard)
        const keepAliveInterval = setInterval(() => {
            if (player) {
                // Get player state to keep connection alive - same approach as Dashboard
                player.getCurrentState()
                    .then((state: any) => {
                        if (!state) {
                            console.log('Device connection lost, reconnecting...');
                            setIsDeviceReady(false);

                            // Attempt reconnection
                            player.connect()
                                .then((success: boolean) => {
                                    if (success) {
                                        console.log('Successfully reconnected player');
                                        setIsDeviceReady(true);

                                        // Re-transfer playback to this device
                                        if (deviceId) {
                                            transferPlaybackToDevice(deviceId)
                                                .then(() => console.log('Playback re-transferred successfully'))
                                                .catch(err => console.error('Error re-transferring playback:', err));
                                        }
                                    }
                                });
                        } else {
                            setIsDeviceReady(true);
                        }
                    });
            }
        }, 3000); // Check every 3 seconds - critical for preventing disconnection

        return () => {
            clearInterval(keepAliveInterval);
        };
    }, [player, isPremium, deviceId]);

    useEffect(() => {
        // Skip if player isn't available
        if (!player) return;

        console.log('Setting up player state listener');

        const stateListener = (state: any) => {
            if (!state) {
                console.log('Player state is null, device likely disconnected');
                setIsDeviceReady(false);
                return;
            }

            // Update UI state based on actual player state
            setIsPlaying(!state.paused);

            // Update current track if it's different
            if (state.track_window?.current_track) {
                const spotifyTrack = state.track_window.current_track;
                setCurrentlyPlayingTrack(spotifyTrack.id);
            }
        };

        player.addListener('player_state_changed', stateListener);

        return () => {
            player.removeListener('player_state_changed', stateListener);
        };
    }, [player]);

    // Add this effect to fix reconnection issues
    useEffect(() => {
        // When component mounts, verify that the device is still active
        if (isPremium && deviceId) {
            // Immediately check device status
            fetch('https://api.spotify.com/v1/me/player/devices', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    const deviceActive = data.devices &&
                        data.devices.some((device: any) => device.id === deviceId);

                    if (!deviceActive) {
                        console.log('Device inactive on component mount, reconnecting...');
                        setIsDeviceReady(false);
                        reconnectSpotifyDevice();
                    } else {
                        setIsDeviceReady(true);
                    }
                })
                .catch(err => {
                    console.error('Error checking device status:', err);
                });
        }
    }, [isPremium, deviceId, reconnectSpotifyDevice]);

    useEffect(() => {
        // Add specific mobile touch handling
        if ('ontouchstart' in window) {
            const trackItems = document.querySelectorAll('.track-item');
            
            trackItems.forEach(item => {
                // Add touch feedback
                item.addEventListener('touchstart', () => {
                    item.classList.add('touch-active');
                });
                
                item.addEventListener('touchend', () => {
                    setTimeout(() => {
                        item.classList.remove('touch-active');
                    }, 150);
                });
                
                item.addEventListener('touchcancel', () => {
                    item.classList.remove('touch-active');
                });
            });
            
            // Add this class to the main container
            document.querySelector('.playlist-detail-container')?.classList.add('touch-device');
        }
        
        // Handle main content scroll events
        const handleScroll = () => {
            const container = document.querySelector('.playlist-detail-container');
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Show premium badge when scrolled past header (200px threshold)
            if (scrollTop > 200) {
                setIsScrolled(true);
                container?.classList.add('scrolled');
            } else {
                setIsScrolled(false);
                container?.classList.remove('scrolled');
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.querySelector('.playlist-detail-container')?.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.querySelector('.playlist-detail-container')?.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Add progress tracking effect - MOVED HERE TO COMPLY WITH HOOKS RULES
    useEffect(() => {
        if (isPremium && isPlaying && currentlyPlayingTrack) {
            const interval = setInterval(() => {
                // Get current playback state from Spotify
                fetch('https://api.spotify.com/v1/me/player', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data && data.item && data.progress_ms) {
                        const progressPercent = (data.progress_ms / data.item.duration_ms) * 100;
                        setCurrentProgress(progressPercent);
                        setCurrentPlaybackTime(data.progress_ms / 1000);
                    }
                })
                .catch(err => console.error('Error getting playback state:', err));
            }, 1000);
            
            setProgressInterval(interval);
            return () => clearInterval(interval);
        } else if (!isPremium && isPlaying && audioRef.current) {
            // For preview mode, track progress manually
            const interval = setInterval(() => {
                if (audioRef.current) {
                    const currentTime = audioRef.current.currentTime;
                    const duration = audioRef.current.duration || 30; // 30 seconds for preview
                    const progressPercent = (currentTime / duration) * 100;
                    setCurrentProgress(progressPercent);
                    setCurrentPlaybackTime(currentTime);
                }
            }, 1000);
            
            setProgressInterval(interval);
            return () => clearInterval(interval);
        } else {
            if (progressInterval) {
                clearInterval(progressInterval);
                setProgressInterval(null);
            }
        }
    }, [isPremium, isPlaying, currentlyPlayingTrack, progressInterval]);

    // Reset progress when track changes - MOVED HERE TO COMPLY WITH HOOKS RULES
    useEffect(() => {
        setCurrentProgress(0);
        setCurrentPlaybackTime(0);
    }, [currentlyPlayingTrack]);

    // Setup audio element and listeners
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.addEventListener('ended', handleTrackEnded);
            audioRef.current.addEventListener('error', handleAudioError);
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleTrackEnded);
                audioRef.current.removeEventListener('error', handleAudioError);
                audioRef.current = null;
            }
        };
    }, [handleTrackEnded, handleAudioError]);

    // Add scroll detection to know when user is scrolling the tracks list
    useEffect(() => {
        if (!loading) {
            const tracksListElement = document.querySelector('.tracks-list');
            if (!tracksListElement) return;

            let scrollTimeout: number;
            const handleScroll = () => {
                // Add scrolling class to enable scroll-specific styles
                tracksListElement.classList.add('scrolling');

                // Clear previous timeout
                window.clearTimeout(scrollTimeout);

                // Set new timeout to remove the class after scrolling stops
                scrollTimeout = window.setTimeout(() => {
                    tracksListElement.classList.remove('scrolling');
                }, 150);
            };

            tracksListElement.addEventListener('scroll', handleScroll);
            return () => {
                tracksListElement.removeEventListener('scroll', handleScroll);
                window.clearTimeout(scrollTimeout);
            };
        }
    }, [loading]);

    // Add loading skeleton component
    const LoadingSkeleton = () => (
        <div className="playlist-detail-skeleton">
            <div className="playlist-header-skeleton">
                <div className="playlist-cover-skeleton loading-skeleton"></div>
                <div className="playlist-info-skeleton">
                    <div className="playlist-title-skeleton loading-skeleton"></div>
                    <div className="playlist-meta-skeleton loading-skeleton"></div>
                </div>
            </div>

            <div className="tracks-skeleton">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="track-skeleton loading-skeleton"></div>
                ))}
            </div>
        </div>
    );

    // EARLY RETURNS AFTER ALL HOOKS
    if (loading) {
        return (
            <div className="playlist-detail-container">
                <button className="back-button" onClick={handleBackClick}>
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path fill="currentColor" d="M15.957 2.793a1 1 0 010 1.414L8.164 12l7.793 7.793a1 1 0 11-1.414 1.414L5.336 12l9.207-9.207a1 1 0 011.414 0z" />
                    </svg>
                </button>
                <LoadingSkeleton />
            </div>
        );
    }

    if (!playlist) {
        return <div className="playlist-error">Playlist not found</div>;
    }

    const displayTracks = isShuffled ? shuffledTracks : tracks;

    return (
        <div className={`playlist-detail-container ${isScrolled ? 'scrolled' : ''}`}>
            {/* Floating Premium Badge - Only show when scrolled and user is premium */}
            {isPremium && isScrolled && (
                <span className="premium-badge">
                    <svg viewBox="0 0 24 24" width="12" height="12">
                        <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Premium
                </span>
            )}
            
            <button className="back-button" onClick={handleBackClick}>
                <svg viewBox="0 0 24 24" width="22" height="22">
                    <path fill="currentColor" d="M15.957 2.793a1 1 0 010 1.414L8.164 12l7.793 7.793a1 1 0 11-1.414 1.414L5.336 12l9.207-9.207a1 1 0 011.414 0z" />
                </svg>
            </button>

            <div className="playlist-header">
                <div className="playlist-cover">
                    <ImageWithFallback
                        src={playlist.images?.[0]?.url || ''}
                        alt={playlist.name}
                        className="playlist-image"
                    />
                </div>
                <div className="playlist-info">
                    <p className="playlist-type">Playlist</p>
                    <h1 className="playlist-title">{playlist.name}</h1>
                    <p className="playlist-description">{playlist.description}</p>
                    <div className="playlist-meta">
                        <span>{playlist.tracks.total} tracks</span>
                        <span>{playlist.followers.total} followers</span>
                    </div>
                </div>
            </div>

            <div className="playlist-actions-container">
                <button className="play-button" onClick={handleMainPlayButtonClick}>
                    <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M8 5v14l11-7z" />
                    </svg>
                </button>

                <button 
                    className={`shuffle-button ${isShuffled ? 'active' : ''}`}
                    onClick={toggleShuffle}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                    </svg>
                </button>

                {isPremium && (
                    <button className="download-button">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                        </svg>
                    </button>
                )}

                <button className="more-options-button">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                </button>

                <div className={`device-status ${isDeviceReady ? 'connected' : 'disconnected'}`}>
                    <div className={`status-dot ${isDeviceReady ? 'connected' : 'disconnected'}`}></div>
                    {isDeviceReady ? (
                        <span>Connected to Spotify</span>
                    ) : (
                        <span>Device disconnected</span>
                    )}
                </div>
            </div>

            <div className="playlist-tracks">
                <div className="tracks-header">
                    <span>#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span>Duration</span>
                </div>

                {displayTracks.map((item, index) => (
                    <div
                        key={item.track.id}
                        className={`track-item ${currentlyPlayingTrack === item.track.id ? 'active' : ''}`}
                        onClick={() => handlePlayTrack(item.track)}
                        onTouchStart={(e) => handleTrackTap(item.track, e)}
                    >
                        <div className="track-number">{index + 1}</div>
                        <div className="play-icon">
                            <svg viewBox="0 0 24 24" width="12" height="12">
                                <path fill="currentColor" d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <div className="track-title-section">
                            <ImageWithFallback
                                src={item.track.album.images?.[0]?.url || ''}
                                alt={item.track.name}
                                className="track-image"
                            />
                            <div className="track-info">
                                <p className="track-name">{item.track.name}</p>
                                <p className="track-artist">
                                    {item.track.artists.map(artist => artist.name).join(', ')}
                                </p>
                            </div>
                        </div>
                        <div className="track-album">{item.track.album.name}</div>
                        <div className="track-duration">{formatDuration(item.track.duration_ms)}</div>
                    </div>
                ))}
            </div>

            {/* Spotify-like footer with progress bar */}
            <div className="spotify-footer">
                <div className="now-playing">
                    <div className="track-info">
                        <div className="track-image">
                            {currentlyPlayingTrack ? (
                                <ImageWithFallback
                                    src={playlist.tracks.items.find((t: any) => t.track.id === currentlyPlayingTrack)?.track.album.images?.[0]?.url || ''}
                                    alt="Now Playing"
                                    className="track-image"
                                />
                            ) : (
                                <div className="music-placeholder-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="track-details">
                            <div className="track-name">
                                {currentlyPlayingTrack ? 
                                    playlist.tracks.items.find((t: any) => t.track.id === currentlyPlayingTrack)?.track.name || 'Unknown Track' : 
                                    'Select a track'
                                }
                            </div>
                            <div className="track-artist">
                                {currentlyPlayingTrack ? 
                                    playlist.tracks.items.find((t: any) => t.track.id === currentlyPlayingTrack)?.track.artists.map((artist: any) => artist.name).join(', ') || 'Unknown Artist' : 
                                    'No track playing'
                                }
                            </div>
                        </div>
                    </div>
                    <button className="like-button">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </button>
                </div>

                <div className="player-controls">
                    <div className="control-buttons">
                        <button className="control-button" onClick={toggleShuffle}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                            </svg>
                        </button>
                        <button className="control-button" onClick={handlePreviousTrack}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                            </svg>
                        </button>
                        <button className="play-pause-button" onClick={handlePlayPauseClick}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d={isPlaying ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z"} />
                            </svg>
                        </button>
                        <button className="control-button" onClick={handleNextTrack}>
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                            </svg>
                        </button>
                        <button className="control-button">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                            </svg>
                        </button>
                    </div>

                    <div className="playback-bar">
                        <div className="playback-time">{formatTime(currentPlaybackTime)}</div>
                        <div className="progress-bar" onClick={handleProgressClick}>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${currentProgress}%` }}></div>
                            </div>
                        </div>
                        <div className="playback-time">
                            {currentlyPlayingTrack ? formatTime((playlist.tracks.items.find((t: any) => t.track.id === currentlyPlayingTrack)?.track.duration_ms || 0) / 1000) : '0:00'}
                        </div>
                    </div>
                </div>

                <div className="volume-controls">
                    <button className="control-button">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                    </button>
                    <div className="volume-bar">
                        <div className="volume-bg">
                            <div className="volume-fill" style={{ width: '70%' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistDetail;