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
    const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

    // Helper function for formatting duration
    const formatDuration = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
    };

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

    // Add this useEffect after your other useEffects

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
            if (container && container.scrollTop > 100) {
                container.classList.add('scrolled');
            } else if (container) {
                container.classList.remove('scrolled');
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        document.querySelector('.playlist-detail-container')?.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.querySelector('.playlist-detail-container')?.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Add a function to handle SDK playback errors
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





    // Replace the complex handlePlayTrack function with this simplified version (around line 400)

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
    }, [audioRef, currentlyPlayingTrack, isPlaying, isPremium, deviceId, isDeviceReady, player]);

    // Add this fallbackToPreview helper function
    const fallbackToPreview = (track: Track) => {
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
    };

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
            if (currentIndex > 0) {
                const prevTrack = tracks[currentIndex - 1].track;
                handlePlayTrack(prevTrack);
            }
        }
    }, [isPremium, deviceId, isDeviceReady, currentlyPlayingTrack, tracks, id, handlePlayTrack, handlePlaybackError]);

    // Handle play/pause button - MOVED INSIDE COMPONENT
    const handlePlayPauseClick = useCallback(() => {
        if (isPremium && deviceId) {
            if (!isDeviceReady) {
                console.log('Device not ready, attempting reconnection before playing...');

                reconnectSpotifyDevice()
                    .then(success => {
                        if (success) {
                            console.log('Reconnection successful, waiting before toggling playback...');
                            // Wait for reconnection to stabilize
                            setTimeout(() => {
                                // Toggle play state using API endpoint
                                const endpoint = isPlaying ? 'pause' : 'play';
                                fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                                    }
                                })
                                    .then(() => setIsPlaying(!isPlaying))
                                    .catch(err => handlePlaybackError(err));
                            }, 1500);
                        } else {
                            // Fall back to preview mode if reconnection fails
                            console.error('Failed to reconnect, falling back to preview mode');
                            setIsPremium(false);

                            if (currentlyPlayingTrack) {
                                // Toggle preview playback
                                if (isPlaying) {
                                    audioRef.current?.pause();
                                } else {
                                    audioRef.current?.play();
                                }
                                setIsPlaying(!isPlaying);
                            } else if (tracks.length > 0) {
                                // Start playing first track
                                handlePlayTrack(tracks[0].track);
                            }
                        }
                    });
            } else {
                // Device is ready, use API to toggle play/pause
                const endpoint = isPlaying ? 'pause' : 'play';
                fetch(`https://api.spotify.com/v1/me/player/${endpoint}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    // Add empty body for play requests to avoid HTTP 400 errors
                    ...(endpoint === 'play' && { body: JSON.stringify({}) })
                })
                    .then(() => setIsPlaying(!isPlaying))
                    .catch(err => {
                        console.error(`Error ${isPlaying ? 'pausing' : 'playing'}:`, err);
                        handlePlaybackError(err);
                    });
            }
        } else {
            // Non-Premium preview mode (no changes needed)
            if (currentlyPlayingTrack) {
                if (isPlaying) {
                    audioRef.current?.pause();
                } else {
                    audioRef.current?.play();
                }
                setIsPlaying(!isPlaying);
            } else if (tracks.length > 0) {
                handlePlayTrack(tracks[0].track);
            }
        }
    }, [isPremium, deviceId, isDeviceReady, isPlaying, currentlyPlayingTrack, tracks, reconnectSpotifyDevice, handlePlayTrack, handlePlaybackError]);


    // Handle audio errors
    const handleAudioError = useCallback((e: Event) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        alert("Error playing track. The preview may not be available.");
    }, [setIsPlaying]);

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
    const handleBackClick = () => {
        // When going back, preserve our premium status by explicitly setting it
        if (isPremium) {
            localStorage.setItem('spotify_is_premium', 'true');
            localStorage.setItem('spotify_player_ready', isDeviceReady ? 'true' : 'false');
        }
        
        // Use navigate to dashboard to ensure a clean mount
        navigate('/dashboard', { 
            replace: true  // Replace the current history entry
        });
    };

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

    // Enhanced loading state
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

    return (
        <div className="playlist-detail-container">
            <button
                className="back-button"
                onClick={handleBackClick}
                aria-label="Go back"
            >
                <svg viewBox="0 0 24 24" width="22" height="22">
                    <path fill="currentColor" d="M15.957 2.793a1 1 0 010 1.414L8.164 12l7.793 7.793a1 1 0 11-1.414 1.414L5.336 12l9.207-9.207a1 1 0 011.414 0z" />
                </svg>
            </button>

            <div className="playlist-header">
                <div className="playlist-cover">
                    <ImageWithFallback
                        src={playlist.images?.[0]?.url}
                        alt={playlist.name}
                        className="playlist-image"
                    />
                </div>

                <div className="playlist-info">
                    <span className="playlist-type">Playlist</span>
                    <h1 className="playlist-title">{playlist.name}</h1>
                    <p className="playlist-description">{playlist.description || 'No description available'}</p>
                    <div className="playlist-meta">
                        <span>{playlist.owner?.display_name}</span>
                        <span>{playlist.followers?.total || 0} followers</span>
                        <span>{tracks.length} tracks</span>
                    </div>
                </div>
            </div>

            <div className="playlist-actions-container">
                <button
                    className="play-button"
                    onClick={handleMainPlayButtonClick}
                    aria-label={isPlaying ? "Pause playlist" : "Play playlist"}
                >
                    {isPlaying ? (
                        <svg viewBox="0 0 16 16" width="32" height="32">
                            <rect x="3" y="2" width="4" height="12" fill="currentColor" />
                            <rect x="9" y="2" width="4" height="12" fill="currentColor" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 16 16" width="32" height="32">
                            <path fill="currentColor" d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z" />
                        </svg>
                    )}
                </button>

                <button
                    className={`shuffle-button ${isShuffled ? 'active' : ''}`}
                    onClick={toggleShuffle}
                    aria-label={isShuffled ? "Disable shuffle" : "Enable shuffle"}
                >
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                    </svg>
                </button>

                {/* Add Premium badge */}
                {isPremium && (
                    <div className="premium-badge">
                        <svg viewBox="0 0 16 16" width="16" height="16">
                            <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                        </svg>
                        <span>Premium</span>
                    </div>
                )}
            </div>

            <div className="playlist-tracks">
                <div className="tracks-header">
                    <div className="track-number">#</div>
                    <div className="track-title">Title</div>
                    <div className="track-album">Album</div>
                    <div className="track-duration">Duration</div>
                </div>

                <div className="tracks-list">
                    {tracks.map((item, index) => (
                        <div
                            key={item.track.id + index}
                            className={`track-item ${currentlyPlayingTrack === item.track.id ? 'active' : ''}`}
                            onClick={() => handlePlayTrack(item.track)}
                            onTouchStart={(e) => handleTrackTap(item.track, e)}
                            onTouchEnd={(e) => e.preventDefault()}
                            tabIndex={0}
                            role="button"
                            aria-pressed={currentlyPlayingTrack === item.track.id}
                            aria-label={`Play ${item.track.name} by ${item.track.artists.map((a: { name: string }) => a.name).join(', ')}`}
                        >
                            <div className="track-number">
                                {currentlyPlayingTrack === item.track.id && isPlaying ? (
                                    <div className="now-playing-icon">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
                                ) : (
                                    index + 1
                                )}
                            </div>

                            <div className="track-title-section">
                                <ImageWithFallback
                                    src={item.track.album.images?.[0]?.url}
                                    alt={item.track.album.name}
                                    className="track-image"
                                />
                                <div className="play-icon">
                                    {currentlyPlayingTrack === item.track.id && isPlaying ? (
                                        <svg viewBox="0 0 16 16" width="16" height="16">
                                            <rect x="3" y="2" width="4" height="12" fill="currentColor" />
                                            <rect x="9" y="2" width="4" height="12" fill="currentColor" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 16 16" width="16" height="16">
                                            <path fill="currentColor" d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="track-info">
                                    <div className="track-name">{item.track.name}</div>
                                    <div className="track-artist">{item.track.artists.map((a: { name: string }) => a.name).join(', ')}</div>
                                </div>
                            </div>
                            <div className="track-album">{item.track.album.name}</div>
                            <div className="track-duration">{formatDuration(item.track.duration_ms)}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Playback controls footer */}
            <footer className="spotify-footer">
              <div className="now-playing">
                <div className="track-info">
                  <div className="track-image">
                    {currentlyPlayingTrack ? (
                      <img
                        src={
                          currentlyPlayingTrack && 
                          tracks.find(item => item.track.id === currentlyPlayingTrack)?.track.album.images?.[0]?.url || 
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            tracks.find(item => item.track.id === currentlyPlayingTrack)?.track.artists[0].name || "Music"
                          )}&background=6c2dc7&color=fff&size=56&bold=true&rounded=true`
                        }
                        alt="Album artwork"
                      />
                    ) : (
                      <div className="music-placeholder-icon">
                        <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                            fill="#6c2dc7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="track-details">
                    <div className="track-name">
                      {currentlyPlayingTrack ? 
                        tracks.find(item => item.track.id === currentlyPlayingTrack)?.track.name : 
                        'Select a track'}
                    </div>
                    <div className="track-artist">
                      {currentlyPlayingTrack ?
                        tracks.find(item => item.track.id === currentlyPlayingTrack)?.track.artists.map(artist => artist.name).join(', ') :
                        'to start playing'}
                    </div>
                  </div>
                  
                  <button className="like-button">
                    <svg viewBox="0 0 16 16" width="16" height="16">
                      <path fill="currentColor" d="M1.69 2A4.582 4.582 0 008 2.023 4.583 4.583 0 0011.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="player-controls">
                <div className="control-buttons">
                  <button className="control-button" onClick={handlePreviousTrack}>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                      <path d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z" fill="currentColor"></path>
                    </svg>
                  </button>

                  <button className="control-button play-pause-button" onClick={handlePlayPauseClick}>
                    {isPlaying ? (
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"></path>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z" fill="currentColor"></path>
                      </svg>
                    )}
                  </button>

                  <button className="control-button" onClick={handleNextTrack}>
                    <svg viewBox="0 0 16 16" width="16" height="16">
                      <path d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z" fill="currentColor"></path>
                    </svg>
                  </button>

                  {/* Premium badge in control buttons area - match Dashboard layout */}
                  {isPremium && (
                    <button className="control-button premium-button">
                      <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                      </svg>
                      <span>Premium</span>
                    </button>
                  )}
                </div>

                <div className="playback-bar">
                  <span className="playback-time">0:00</span>
                  <div className="progress-bar">
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{
                        width: currentProgress ? `${currentProgress}%` : '0%'
                      }}></div>
                    </div>
                  </div>
                  <span className="playback-time">
                    {currentlyPlayingTrack && tracks.find(item => item.track.id === currentlyPlayingTrack) ?
                      formatDuration(tracks.find(item => item.track.id === currentlyPlayingTrack)!.track.duration_ms) :
                      '0:00'}
                  </span>
                </div>
              </div>
            </footer>

            {/* Add the same premium badge as Dashboard */}
            {isPremium ? (
              <div className="premium-badge">
                <svg viewBox="0 0 16 16" width="16" height="16">
                  <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                </svg>
                <span>Premium Active</span>
              </div>
            ) : (
              <div className="preview-badge">
                <span>Using Preview Mode</span>
                <a href="https://www.spotify.com/premium/" target="_blank" rel="noopener noreferrer">
                  Get Premium
                </a>
              </div>
            )}

            {/* Device reconnection indicator - identical to Dashboard */}
            {isPremium && !isDeviceReady && (
              <div className="device-reconnecting">
                <svg viewBox="0 0 16 16" width="16" height="16" className="spinner">
                  <path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 7.5h-2v2a.5.5 0 01-1 0v-2h-2a.5.5 0 010-1h2v-2a.5.5 0 011 0v2h2a.5.5 0 010 1z" />
                </svg>
                <span>Reconnecting player...</span>
              </div>
            )}
        </div>
    );
};

// Helper function for formatting duration
const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
};


export default PlaylistDetail;