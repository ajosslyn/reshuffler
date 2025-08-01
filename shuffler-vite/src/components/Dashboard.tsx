import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    fetchPlaylists,
    fetchUserProfile,
    fetchPlaylistTracks,
    transferPlaybackToDevice,
    playTrackOnDevice,
    playPlaylistOnDevice  // Add this new import
} from '../api/spotify';
import { Track } from '../types/spotify.types';
import PlaylistCard from './Playlist/PlaylistCard';
import SmartGrouping from './Playlist/SmartGrouping';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import ImageWithFallback from './common/ImageWithFallback';

// Define local DashboardTrack interface for internal use
interface DashboardTrack {
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

// Add at the top, after your imports
declare global {
    interface Window {
        Spotify?: {
            Player: any;
            [key: string]: any;
        };
        onSpotifyWebPlaybackSDKReady: () => void;
    }
}

// Define Track interface
// (Removed - now using imported Track from types/spotify.types)

// Add this type definition near your other interfaces
interface SpotifyPlayerState {
    context?: {
        uri: string;
        metadata?: Record<string, any>;
    };
    disallows?: {
        pausing?: boolean;
        peeking_next?: boolean;
        peeking_prev?: boolean;
        resuming?: boolean;
        seeking?: boolean;
        skipping_next?: boolean;
        skipping_prev?: boolean;
    };
    duration?: number;
    paused?: boolean;
    position?: number;
    repeat_mode?: number;
    shuffle?: boolean;
    track_window?: {
        current_track: {
            id: string;
            name: string;
            duration_ms: number;
            artists: Array<{ name: string; uri: string }>;
            album: {
                name: string;
                uri: string;
                images: Array<{ url: string }>;
            };
        };
        previous_tracks: any[];
        next_tracks: any[];
    };
}

const Dashboard: React.FC = () => {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    // Add this state
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    const [userName, setUserName] = useState<string>('Spotify User');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [greeting, setGreeting] = useState<string>('Good morning');
    // New state variables for playback
    const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<DashboardTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPlaylist, setCurrentPlaylist] = useState<any>(null);
    const [playlistTracks, setPlaylistTracks] = useState<Array<{ track: DashboardTrack }>>([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Add these state variables with your other useState declarations
    const [player, setPlayer] = useState<any>(null);
    const [deviceId, setDeviceId] = useState<string>('');
    const [isPremium, setIsPremium] = useState<boolean>(false);

    // Add this to your state variables
    const [isDeviceReady, setIsDeviceReady] = useState<boolean>(false);
    const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

    // Add progress tracking state
    const [progress, setProgress] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [currentPosition, setCurrentPosition] = useState<number>(0);
    const [isScrolled, setIsScrolled] = useState<boolean>(false);

    const navigate = useNavigate();

    useEffect(() => {
        // Set greeting based on time of day
        const hours = new Date().getHours();
        if (hours >= 5 && hours < 12) {
            setGreeting('Good morning');
        } else if (hours >= 12 && hours < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }

        const loadData = async () => {
            try {
                setLoading(true);

                // Load user profile
                const userData = await fetchUserProfile();
                setUserName(userData.display_name || 'Spotify User');
                if (userData.images && userData.images.length > 0) {
                    setUserAvatar(userData.images[0].url);
                }

                // Load playlists
                const playlistsData = await fetchPlaylists();

                // Check the structure to avoid errors
                if (Array.isArray(playlistsData)) {
                    setPlaylists(playlistsData);
                } else if (playlistsData && Array.isArray(playlistsData.items)) {
                    setPlaylists(playlistsData.items);
                } else {
                    console.error('Unexpected playlists data structure:', playlistsData);
                    setPlaylists([]);
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                setPlaylists([]);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    // Simplified scroll detection for both header background and premium badge
    useEffect(() => {
        const checkScroll = () => {
            let isScrolled = false;
            
            // Check window scroll (mobile)
            if (window.scrollY > 50) {
                isScrolled = true;
            }
            
            // Check spotify-main scroll (desktop grid layout)
            const spotifyMain = document.querySelector('.spotify-main');
            if (spotifyMain && spotifyMain.scrollTop > 50) {
                isScrolled = true;
            }
            
            // Update header background for main content (separate logic for header styling)
            const mainContent = document.querySelector('.spotify-main');
            if (mainContent) {
                if (mainContent.scrollTop > 10) {
                    mainContent.classList.add('scrolled');
                } else {
                    mainContent.classList.remove('scrolled');
                }
            }
            
            setIsScrolled(isScrolled);
        };

        // Add scroll listeners
        window.addEventListener('scroll', checkScroll, { passive: true });
        
        // Add listener to spotify-main for desktop
        const spotifyMain = document.querySelector('.spotify-main');
        if (spotifyMain) {
            spotifyMain.addEventListener('scroll', checkScroll, { passive: true });
        }
        
        // Initial check with a small delay to ensure DOM is ready
        setTimeout(checkScroll, 100);
        
        return () => {
            window.removeEventListener('scroll', checkScroll);
            if (spotifyMain) {
                spotifyMain.removeEventListener('scroll', checkScroll);
            }
        };
    }, []);

    // Add this useEffect for initializing the Spotify Web SDK
    useEffect(() => {

        // Check localStorage immediately for premium status restoration
        const storedIsPremium = localStorage.getItem('spotify_is_premium') === 'true';
        const storedDeviceId = localStorage.getItem('spotify_device_id');
        const storedDeviceReady = localStorage.getItem('spotify_player_ready') === 'true';

        // Restore premium state from localStorage if available
        if (storedIsPremium) {
            console.log('Restoring premium state from previous session');
            setIsPremium(true);

            // If we have device ID, restore that too
            if (storedDeviceId) {
                setDeviceId(storedDeviceId);
                setIsDeviceReady(storedDeviceReady);
            }
        }

        // Don't reload script if it's already loaded
        if (!document.getElementById('spotify-player-sdk')) {
            const script = document.createElement('script');
            script.id = 'spotify-player-sdk';
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);

            window.onSpotifyWebPlaybackSDKReady = () => {
                console.log("Spotify SDK Ready");
                const token = localStorage.getItem('accessToken');

                if (!token) {
                    console.error("No access token available");
                    return;
                }

                // Add this check to verify Spotify is available
                if (!window.Spotify) {
                    console.error("Spotify SDK not available");
                    return;
                }

                const spotifyPlayer = new window.Spotify.Player({
                    name: 'Music Shuffler',
                    getOAuthToken: (cb: (token: string) => void) => { cb(token); },
                    volume: 0.5
                });

                // Add connection state listener
                spotifyPlayer.addListener('player_state_changed', (state: SpotifyPlayerState | null) => {
                    console.log('Dashboard: Player state changed:', state ? 'State received' : 'No state (device likely disconnected)');

                    if (!state) {
                        setIsDeviceReady(false);
                        return;
                    }

                    // Only process state changes if device is properly registered
                    if (!deviceId || !isDeviceReady) {
                        console.log('Dashboard: Device not ready, ignoring state change');
                        return;
                    }

                    // Update device ready state
                    setIsDeviceReady(true);

                    // Update UI
                    setIsPlaying(!state.paused);
                    console.log('Dashboard: Setting isPlaying to:', !state.paused);

                    // Track info
                    if (state.track_window?.current_track) {
                        const spotifyTrack = state.track_window.current_track;
                        const currentTrack = {
                            id: spotifyTrack.id,
                            name: spotifyTrack.name,
                            artists: spotifyTrack.artists,
                            album: spotifyTrack.album,
                            duration_ms: spotifyTrack.duration_ms,
                            preview_url: '' // We don't have this from state
                        };
                        console.log('Dashboard: Setting currentlyPlayingTrack to:', currentTrack.id, currentTrack.name);
                        setCurrentlyPlayingTrack(currentTrack);
                        setDuration(spotifyTrack.duration_ms);
                    }

                    // Update progress
                    if (state.position !== undefined && state.duration !== undefined) {
                        setCurrentPosition(state.position);
                        if (state.duration > 0) {
                            setProgress((state.position / state.duration) * 100);
                        }
                    }
                });

                // Update these event listeners with proper type annotations

                spotifyPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
                    console.log('Ready with Device ID:', device_id);
                    setDeviceId(device_id);
                    setPlayer(spotifyPlayer);
                    setIsPremium(true);
                    setIsDeviceReady(true);

                    // Add these lines to store values for PlaylistDetail
                    localStorage.setItem('spotify_device_id', device_id);
                    localStorage.setItem('spotify_is_premium', 'true');
                    localStorage.setItem('spotify_player_ready', 'true');

                    transferPlaybackToDevice(device_id)
                        .then(() => console.log('Playback transferred successfully'))
                        .catch(err => console.error('Error transferring playback:', err));
                });

                // Update your not_ready handler
                spotifyPlayer.addListener('not_ready', ({ device_id }: { device_id: string }) => {
                    console.log('Device ID has gone offline', device_id);
                    setIsDeviceReady(false);

                    // Add this to update localStorage
                    localStorage.setItem('spotify_player_ready', 'false');
                });

                // Connect to the player!
                spotifyPlayer.connect()
                    .then((success: boolean) => {
                        if (!success) {
                            console.error('Failed to connect to Spotify');
                        }
                    });
            };
        }

        return () => {
            if (player) {
                player.disconnect();
            }
        };
    }, [navigate, player]);



    useEffect(() => {
        // Skip if player is already initialized or user isn't premium
        if (player || !isPremium) return;
        
        // Try to reconnect if we have a device ID but no player
        const storedDeviceId = localStorage.getItem('spotify_device_id');
        if (isPremium && storedDeviceId && !player) {
            console.log('Attempting to reconnect to previous Spotify session');
            
            // Verify the device is still active
            fetch('https://api.spotify.com/v1/me/player/devices', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            })
            .then(response => response.json())
            .then(data => {
                const deviceActive = data.devices && 
                    data.devices.some((device: any) => device.id === storedDeviceId);
                
                if (deviceActive) {
                    console.log('Previous device still active, restoring session');
                    setDeviceId(storedDeviceId);
                    setIsDeviceReady(true);
                } else {
                    console.log('Previous device no longer active, will reinitialize');
                    // The SDK initialization will handle creating a new device
                }
            })
            .catch(err => {
                console.error('Error checking device status:', err);
            });
        }

        console.log('Setting up device keep-alive interval');

        // Keep-alive ping to prevent device disconnection
        const keepAliveInterval = setInterval(() => {
            if (player) {
                // Get player state to keep connection alive
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
                                                .then(() => {
                                                    console.log('Playback re-transferred successfully');
                                                    // Resume playback if something was playing
                                                    if (currentlyPlayingTrack && isPlaying) {
                                                        setTimeout(() => {
                                                            player.resume();
                                                        }, 1000);
                                                    }
                                                })
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
    }, [player, isPremium, deviceId, currentlyPlayingTrack, isPlaying]);

    const handlePlaybackError = (err: any) => {
        console.error("Error playing track:", err);

        // Check if error is related to device registration
        if (err.message && (
            err.message.includes('device is not registered') ||
            err.message.includes('device_not_found')
        )) {
            setIsDeviceReady(false);
            alert("Playback device disconnected. Attempting to reconnect...");
        } else {
            alert("Failed to play track. Please try again or refresh the page.");
        }
    };

    const fallbackToPreview = (track?: DashboardTrack) => {
        // Switch to preview mode when Premium playback fails completely
        setIsPremium(false);

        if (track && track.preview_url) {
            if (audioRef.current) {
                audioRef.current.src = track.preview_url;
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        setCurrentlyPlayingTrack(track);
                    })
                    .catch(err => {
                        console.error("Error playing preview:", err);
                        alert("Could not play audio preview. This may be due to browser autoplay restrictions.");
                    });
            }
        } else if (track) {
            console.warn("No preview available for track:", track.name);
            alert("No preview available for this track and Premium playback failed. Please try a different track or refresh the page.");
        } else {
            console.warn("No track provided to fallbackToPreview");
            alert("Premium playback failed and no track information available. Please refresh the page.");
        }
    };


    // Handle track context from SmartGrouping for navigation
    const handleTrackChange = useCallback((tracks: Track[], currentIndex: number) => {
        console.log('Dashboard: Received track context from SmartGrouping:', tracks.length, 'tracks, current index:', currentIndex);
        
        // Convert Track[] to DashboardTrack[] for navigation
        const dashboardTracks = tracks.map(track => ({
            id: track.id,
            name: track.name,
            artists: [{ name: track.artist }],
            album: {
                name: track.album,
                images: []
            },
            duration_ms: track.duration * 1000,
            preview_url: undefined
        }));
        
        const playlistTracks = dashboardTracks.map(track => ({ track }));
        setPlaylistTracks(playlistTracks);
        setCurrentTrackIndex(currentIndex);
        
        // Set a virtual SmartGrouping playlist context
        setCurrentPlaylist({ 
            id: 'smart-grouping', 
            name: 'Smart Grouping', 
            type: 'smart-grouping' 
        });
    }, []);

    // First define handlePlayTrack since other functions depend on it

    // Update the handlePlayTrack function to use the imported functions
    const handlePlayTrack = useCallback(async (track: DashboardTrack) => {
        console.log('Dashboard: handlePlayTrack called with track:', track.id, track.name);
        
        // Set the track immediately for UI feedback
        setCurrentlyPlayingTrack(track);
        
        if (isPremium && deviceId && player) {
            console.log('Dashboard: Using premium SDK playback');
            
            try {
                // First check device health
                const { checkDeviceHealth } = await import('../api/spotify');
                const deviceHealth = await checkDeviceHealth(deviceId);
                
                if (!deviceHealth.exists) {
                    console.log('Dashboard: Device not found, attempting to reconnect...');
                    setIsReconnecting(true);
                    const success = await player.connect();
                    if (success) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await transferPlaybackToDevice(deviceId);
                        console.log('Dashboard: Device reconnected successfully');
                        setIsReconnecting(false);
                    } else {
                        console.error('Dashboard: Failed to reconnect Spotify player');
                        setIsReconnecting(false);
                        fallbackToPreview(track);
                        return;
                    }
                } else if (!deviceHealth.isActive) {
                    console.log('Dashboard: Device exists but not active, transferring playback...');
                    setIsReconnecting(true);
                    await transferPlaybackToDevice(deviceId);
                    setIsReconnecting(false);
                }
                
                // Now try to play the track
                await playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
                setIsPlaying(true);
                console.log('Dashboard: SDK playback started');
                
            } catch (error: any) {
                console.error('Dashboard: Error playing track via SDK:', error);
                setIsReconnecting(false);
                
                // Handle specific device errors
                if (error.message?.includes('device_not_found')) {
                    console.log('Dashboard: Device not found error, trying to reconnect...');
                    setIsReconnecting(true);
                    try {
                        const success = await player.connect();
                        if (success) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            await transferPlaybackToDevice(deviceId);
                            await playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
                            setIsPlaying(true);
                            console.log('Dashboard: SDK playback started after reconnect');
                        } else {
                            console.error('Dashboard: Failed to reconnect after device_not_found');
                            fallbackToPreview(track);
                        }
                    } catch (reconnectError) {
                        console.error('Dashboard: Error during reconnection:', reconnectError);
                        fallbackToPreview(track);
                    } finally {
                        setIsReconnecting(false);
                    }
                } else {
                    // Other errors, fallback to preview
                    fallbackToPreview(track);
                }
            }
        } else {
            console.log('Dashboard: Using preview mode playback');
            
            if (!track.preview_url) {
                console.log("Dashboard: No preview available for this track");
                alert("No preview available for this track. Full playback requires Spotify Premium.");
                return;
            }

            if (currentlyPlayingTrack && currentlyPlayingTrack.id === track.id) {
                // Toggle play/pause for current track
                if (isPlaying) {
                    audioRef.current?.pause();
                } else {
                    audioRef.current?.play();
                }
                setIsPlaying(!isPlaying);
            } else {
                // Play new track
                if (audioRef.current) {
                    // Check if preview URL is available
                    if (!track.preview_url) {
                        console.warn("Dashboard: No preview URL available for track:", track.name);
                        alert("No preview available for this track. Please try a different track or upgrade to Premium.");
                        return;
                    }
                    
                    audioRef.current.src = track.preview_url;
                    try {
                        await audioRef.current.play();
                        setIsPlaying(true);
                        console.log('Dashboard: Preview playback started');
                    } catch (error) {
                        console.error("Dashboard: Error playing track preview:", error);
                        alert("Failed to play track preview. This may be due to browser autoplay restrictions.");
                    }
                }
            }
        }
    }, [
        isPremium, 
        deviceId, 
        isDeviceReady, 
        player, 
        currentlyPlayingTrack, 
        isPlaying, 
        audioRef, 
        handlePlaybackError, 
        fallbackToPreview
    ]);

    // Then define these functions before the useEffect that uses them
    const handleTrackEnded = useCallback(() => {
        if (currentPlaylist && playlistTracks.length > 0 && currentTrackIndex >= 0) {
            // Play next track in playlist
            const nextIndex = currentTrackIndex + 1;
            if (nextIndex < playlistTracks.length) {
                setCurrentTrackIndex(nextIndex);
                handlePlayTrack(playlistTracks[nextIndex].track);
            } else {
                // End of playlist
                setIsPlaying(false);
                setCurrentlyPlayingTrack(null);
                setCurrentTrackIndex(-1);
            }
        }
    }, [currentPlaylist, playlistTracks, currentTrackIndex, setCurrentTrackIndex, setIsPlaying, setCurrentlyPlayingTrack, handlePlayTrack]);

    const handleAudioError = useCallback((e: Event) => {
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        alert("Error playing track. The preview may not be available.");
    }, [setIsPlaying]);

    // Update your existing cleanup useEffect to include the player
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.addEventListener('ended', handleTrackEnded);
            audioRef.current.addEventListener('error', handleAudioError);
            
            // Add metadata loading event listeners for preview mode
            audioRef.current.addEventListener('loadedmetadata', () => {
                if (audioRef.current) {
                    setDuration(audioRef.current.duration * 1000); // Convert to ms
                }
            });
            
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current) {
                    const currentTime = audioRef.current.currentTime * 1000; // Convert to ms
                    setCurrentPosition(currentTime);
                    if (audioRef.current.duration > 0) {
                        setProgress((currentTime / (audioRef.current.duration * 1000)) * 100);
                    }
                }
            });
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.removeEventListener('ended', handleTrackEnded);
                audioRef.current.removeEventListener('error', handleAudioError);
                audioRef.current = null;
            }

            // Cleanup the player
            if (player) {
                player.disconnect();
            }
        };
    }, [handleTrackEnded, handleAudioError, player]);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const handlePlaylistSelect = (playlist: any) => {
        console.log("Selected playlist:", playlist.id);
        navigate(`/playlist/${playlist.id}`);
    };

    const loadPlaylistTracks = async (playlist: any) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                console.error('No access token found');
                return;
            }

            const tracks = await fetchPlaylistTracks(playlist.id);
            if (tracks && tracks.items) {
                setPlaylistTracks(tracks.items);
                setCurrentPlaylist(playlist);
                return tracks.items;
            }
        } catch (error) {
            console.error('Error fetching playlist tracks:', error);
        }
        return [];
    };

    // Update handlePlayPlaylist with explicit reconnection
    const handlePlayPlaylist = useCallback(async (playlist: any) => {
        // Load tracks first if needed
        let tracks = playlistTracks;
        if (!currentPlaylist || currentPlaylist.id !== playlist.id) {
            tracks = await loadPlaylistTracks(playlist);
        }

        if (!tracks || tracks.length === 0) return;

        if (isPremium && deviceId) {
            try {
                // Explicitly reconnect the device before playing
                console.log('Ensuring device is connected before playing...');

                // Force device reconnection
                if (player) {
                    const connectSuccess = await player.connect();

                    if (!connectSuccess) {
                        throw new Error('Failed to reconnect Spotify player');
                    }

                    console.log('Successfully connected player, waiting before playing...');

                    // Wait for the connection to stabilize
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // Explicitly transfer playback to ensure device registration
                    await transferPlaybackToDevice(deviceId);

                    // Wait for transfer to take effect
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Now attempt to play the playlist
                await playPlaylistOnDevice(`spotify:playlist:${playlist.id}`, deviceId);
                setIsPlaying(true);
                setCurrentPlaylist(playlist);
                setCurrentTrackIndex(0);
            } catch (err: unknown) {
                console.error("Error playing playlist:", err);

                // Error handling remains the same
                let errorMsg = '';
                if (err instanceof Error) {
                    errorMsg = err.message;
                } else if (typeof err === 'string') {
                    errorMsg = err;
                } else if (err && typeof err === 'object' && 'message' in err) {
                    errorMsg = String((err as { message: string }).message);
                }

                if (errorMsg.includes('premium')) {
                    alert("Playing this playlist requires Spotify Premium. Falling back to preview mode.");
                    setIsPremium(false);
                } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
                    alert("This playlist is not available or may have regional restrictions.");
                } else if (errorMsg.includes('device')) {
                    alert("Playback device disconnected. Reconnecting...");
                    setIsDeviceReady(false);
                } else {
                    alert("Failed to play playlist. Please try again.");
                }

                // Try to play the first track as a fallback
                if (tracks && tracks.length > 0) {
                    handlePlayTrack(tracks[0].track);
                }
            }
        } else {
            // Fallback to preview URLs
            setCurrentTrackIndex(0);
            handlePlayTrack(tracks[0].track);
        }
    }, [currentPlaylist, playlistTracks, loadPlaylistTracks, isPremium, deviceId, player, transferPlaybackToDevice, setIsPlaying, setCurrentPlaylist, setCurrentTrackIndex, playPlaylistOnDevice, handlePlayTrack]);

    // Update handlePlayPauseClick
    const handlePlayPauseClick = async () => {
        if (isPremium && player) {
            try {
                // Check device health before attempting to play/pause
                const { checkDeviceHealth } = await import('../api/spotify');
                const deviceHealth = await checkDeviceHealth(deviceId);
                
                if (!deviceHealth.exists) {
                    console.log('Device not found, reconnecting...');
                    const success = await player.connect();
                    if (success) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await transferPlaybackToDevice(deviceId);
                        player.togglePlay();
                    } else {
                        console.error('Failed to reconnect player');
                        setIsPremium(false);
                    }
                } else if (!deviceHealth.isActive) {
                    console.log('Device not active, transferring playback...');
                    await transferPlaybackToDevice(deviceId);
                    player.togglePlay();
                } else {
                    player.togglePlay();
                }
            } catch (error) {
                console.error('Error in handlePlayPauseClick:', error);
                // Fall back to preview mode if there's an error
                setIsPremium(false);
                if (currentlyPlayingTrack) {
                    if (isPlaying) {
                        audioRef.current?.pause();
                    } else {
                        audioRef.current?.play();
                    }
                    setIsPlaying(!isPlaying);
                }
            }
        } else if (currentlyPlayingTrack) {
            // Your existing preview audio code
            if (isPlaying) {
                audioRef.current?.pause();
            } else {
                audioRef.current?.play();
            }
            setIsPlaying(!isPlaying);
        } else if (playlists.length > 0) {
            // Your existing code
            handlePlayPlaylist(playlists[0]);
        }
    };

    const handleLogout = () => {
        // Stop any playing audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        // Clear all auth-related data from localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenExpiration');
        localStorage.removeItem('refreshToken');

        // Clear any application state
        setPlaylists([]);
        setUserName('Spotify User');
        setUserAvatar(null);
        setCurrentlyPlayingTrack(null);
        setIsPlaying(false);

        // Navigate to login page
        navigate('/login');

        // Optional: Display a success message
        console.log('Successfully logged out');
    };

    // Add previous track functionality
    const handlePreviousTrack = useCallback(async () => {
        console.log('Dashboard: handlePreviousTrack called', { 
            isPremium, 
            hasPlayer: !!player, 
            deviceId,
            isDeviceReady,
            currentPlaylist: currentPlaylist?.id,
            playlistTracksLength: playlistTracks.length,
            currentTrackIndex
        });
        
        // Prioritize manual track navigation when we have track context
        if (currentPlaylist && playlistTracks.length > 0 && currentTrackIndex > 0) {
            console.log('Dashboard: Using manual track navigation for previous track');
            const prevIndex = currentTrackIndex - 1;
            const prevTrack = playlistTracks[prevIndex].track;
            setCurrentTrackIndex(prevIndex);
            handlePlayTrack(prevTrack);
        } else if (isPremium && player && deviceId && isDeviceReady) {
            console.log('Dashboard: Using SDK for previous track (no manual context available)');
            try {
                // Check device health before attempting to skip
                const { checkDeviceHealth } = await import('../api/spotify');
                const deviceHealth = await checkDeviceHealth(deviceId);
                
                if (!deviceHealth.exists) {
                    console.log('Device not found, reconnecting...');
                    const success = await player.connect();
                    if (success) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await transferPlaybackToDevice(deviceId);
                        player.previousTrack();
                    } else {
                        console.error('Failed to reconnect player');
                    }
                } else if (!deviceHealth.isActive) {
                    console.log('Device not active, transferring playback...');
                    await transferPlaybackToDevice(deviceId);
                    player.previousTrack();
                } else {
                    player.previousTrack();
                }
            } catch (error) {
                console.error('Error in handlePreviousTrack:', error);
            }
        } else {
            console.log('Dashboard: Cannot play previous track - no track context available');
        }
    }, [isPremium, player, deviceId, isDeviceReady, currentPlaylist, playlistTracks, currentTrackIndex, handlePlayTrack]);

    // Add next track functionality
    const handleNextTrack = useCallback(async () => {
        console.log('Dashboard: handleNextTrack called', { 
            isPremium, 
            hasPlayer: !!player, 
            deviceId,
            isDeviceReady,
            currentPlaylist: currentPlaylist?.id,
            playlistTracksLength: playlistTracks.length,
            currentTrackIndex
        });
        
        // Prioritize manual track navigation when we have track context
        if (currentPlaylist && playlistTracks.length > 0 && currentTrackIndex < playlistTracks.length - 1) {
            console.log('Dashboard: Using manual track navigation for next track');
            const nextIndex = currentTrackIndex + 1;
            const nextTrack = playlistTracks[nextIndex].track;
            setCurrentTrackIndex(nextIndex);
            handlePlayTrack(nextTrack);
        } else if (isPremium && player && deviceId && isDeviceReady) {
            console.log('Dashboard: Using SDK for next track (no manual context available)');
            try {
                // Check device health before attempting to skip
                const { checkDeviceHealth } = await import('../api/spotify');
                const deviceHealth = await checkDeviceHealth(deviceId);
                
                if (!deviceHealth.exists) {
                    console.log('Device not found, reconnecting...');
                    const success = await player.connect();
                    if (success) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        await transferPlaybackToDevice(deviceId);
                        player.nextTrack();
                    } else {
                        console.error('Failed to reconnect player');
                    }
                } else if (!deviceHealth.isActive) {
                    console.log('Device not active, transferring playback...');
                    await transferPlaybackToDevice(deviceId);
                    player.nextTrack();
                } else {
                    player.nextTrack();
                }
            } catch (error) {
                console.error('Error in handleNextTrack:', error);
            }
        } else {
            console.log('Dashboard: Cannot play next track - no track context available or at end of playlist');
        }
    }, [isPremium, player, deviceId, isDeviceReady, currentPlaylist, playlistTracks, currentTrackIndex, handlePlayTrack]);

    // Add progress update interval for smooth progress bar
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isPremium && player && isPlaying) {
            interval = setInterval(() => {
                player.getCurrentState().then((state: SpotifyPlayerState | null) => {
                    if (state && state.position !== undefined && state.duration !== undefined) {
                        setCurrentPosition(state.position);
                        if (state.duration > 0) {
                            setProgress((state.position / state.duration) * 100);
                        }
                    }
                });
            }, 1000);
        } else if (!isPremium && audioRef.current && isPlaying) {
            // For preview mode, update progress based on audio element
            interval = setInterval(() => {
                if (audioRef.current) {
                    const currentTime = audioRef.current.currentTime * 1000; // Convert to ms
                    const duration = audioRef.current.duration * 1000; // Convert to ms
                    setCurrentPosition(currentTime);
                    if (duration > 0) {
                        setProgress((currentTime / duration) * 100);
                    }
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPremium, player, isPlaying]);

    // Format time for display
    const formatTime = (ms: number): string => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Add progress bar click handler for seeking
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;
        
        if (isPremium && player) {
            const seekPosition = (percentage / 100) * duration;
            player.seek(seekPosition);
        } else if (audioRef.current) {
            const seekTime = (percentage / 100) * audioRef.current.duration;
            audioRef.current.currentTime = seekTime;
        }
    };

    if (loading) {
        return <div className="spotify-loading-container">
            <div className="spotify-loading-spinner"></div>
        </div>;
    }

    // Get recommended playlists for top section (first 6)
    const topPlaylists = playlists.slice(0, 6);

    // Use a copy of all playlists for Your Playlists section
    const allPlaylists = [...playlists];



    return (
        <div className={`spotify-layout ${isScrolled ? 'scrolled' : ''}`}>
            {/* Floating Premium Badge - Always render when premium, CSS controls visibility */}
            {isPremium && (
                <div className="premium-badge">
                    <svg viewBox="0 0 16 16" width="16" height="16">
                        <path fill="currentColor" d="M13.151.922a .75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                    </svg>
                    <span>Premium Active</span>
                </div>
            )}
            

            
            {/* Mobile Header */}
            <div className="mobile-header">
                <div className="mobile-header-left">
                    <button className="mobile-menu-btn" onClick={toggleSidebar}>
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="white" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                        </svg>
                    </button>
                </div>
                <div className="mobile-header-title">
                    <h1>{greeting}</h1>
                </div>
                <div className="mobile-header-right">
                    <div className="mobile-user-avatar">
                        {userAvatar ? (
                            <img src={userAvatar} alt={userName} />
                        ) : (
                            <svg viewBox="0 0 16 16" width="24" height="24">
                                <path fill="white" d="M8 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Left Sidebar - add className based on state */}
            <div className={`spotify-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-logo">
                    <svg viewBox="0 0 1134 340" className="spotify-logo">
                        <path fill="white" d="M8 171.4c0 92.6 76.9 167.8 174 167.8 100.4 0 174.6-75.4 174.6-167.8S282.6 4.3 182 4.3C85 4.3 8 78.7 8 171.4zm230.7-58.7c-16.8-16.4-43.9-20.3-70.4-11.1-26.5 9.1-46.8 29.9-55.3 57.2-8.5 27.1-.7 52 20.2 68.5 16.8 16.4 43.9 20.3 70.4 11.1 26.5-9.1 46.8-29.9 55.3-57.2 8.5-27.2.8-52.1-20.2-68.5z" />
                        <path fill="white" d="M135.3 259.3c-42.6 0-77.2-34.3-77.2-76.7 0-42.4 34.5-76.7 77.2-76.7 42.6 0 77.2 34.3 77.2 76.7 0 42.4-34.6 76.7-77.2 76.7zm0-141.9c-36.3 0-65.8 29.2-65.8 65.2 0 36 29.5 65.2 65.8 65.2 36.3 0 65.8-29.2 65.8-65.2 0-36-29.5-65.2-65.8-65.2z" />
                        <path fill="white" d="M139.3 203.5c-3.1 5.8-9.4 9.5-16.2 9.5-10.3 0-18.7-8.2-18.7-18.4 0-10.2 8.4-18.4 18.7-18.4 6.8 0 13.1 3.7 16.2 9.5 3.3 6.3 10.3 9.7 17.2 8.5 7-1.3 12.2-7.3 12.2-14.5 0-29.2-23.9-52.9-53.3-52.9-29.4 0-53.3 23.8-53.3 52.9 0 29.2 23.9 52.9 53.3 52.9 29.4 0 53.3-23.8 53.3-52.9 0-7.2-5.3-13.2-12.2-14.5-6.9-1.2-13.9 2.2-17.2 8.4z" />
                    </svg>
                    <span className="spotify-logo-text">Shuffler</span>
                </div>

                <nav className="sidebar-nav">
                    <ul>
                        <li className="nav-item active">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M13.5 1.515a3 3 0 00-3 0L3 5.845a2 2 0 00-1 1.732V21a1 1 0 001 1h6a1 1 0 001-1v-6h4v6a1 1 0 001 1h6a1 1 0 001-1V7.577a2 2 0 00-1-1.732l-7.5-4.33z" />
                            </svg>
                            <span>Home</span>
                        </li>
                        <li className="nav-item">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 101.414-1.414l-4.344-4.344a9.157 9.157 0 002.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z" />
                            </svg>
                            <span>Search</span>
                        </li>
                        <li className="nav-item">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M14.5 2.134a1 1 0 011 0l6 3.464a1 1 0 01.5.866V21a1 1 0 01-1 1h-6a1 1 0 01-1-1V3a1 1 0 01.5-.866zM16 4.732V20h4V7.041l-4-2.309zM3 22a1 1 0 01-1-1V3a1 1 0 011-1h6a1 1 0 011 1v18a1 1 0 01-1 1H3zm1-2h4V4H4v16z" />
                            </svg>
                            <span>Your Library</span>
                        </li>
                    </ul>

                    <div className="sidebar-section">
                        <div className="sidebar-action">
                            <div className="action-icon">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M15.25 8a.75.75 0 01-.75.75H8.75v5.75a.75.75 0 01-1.5 0V8.75H1.5a.75.75 0 010-1.5h5.75V1.5a.75.75 0 011 0v5.75h5.75a.75.75 0 01.75.75z" />
                                </svg>
                            </div>
                            <span>Create Playlist</span>
                        </div>

                        <div className="sidebar-action">
                            <div className="action-icon liked-songs">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z" />
                                </svg>
                            </div>
                            <span>Liked Songs</span>
                        </div>
                    </div>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-playlists">
                        {playlists.slice(0, 10).map(playlist => (
                            <div
                                key={playlist.id}
                                className="sidebar-playlist-item"
                                onClick={() => handlePlaylistSelect(playlist)}
                            >
                                {playlist.name}
                            </div>
                        ))}
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <main className="spotify-main">
                <div className="main-header">
                    <div className="navigation-buttons">
                        <button className="nav-button" onClick={() => window.history.back()}>
                            <svg viewBox="0 0 24 24" width="22" height="22">
                                <path fill="currentColor" d="M15.957 2.793a1 1 0 010 1.414L8.164 12l7.793 7.793a1 1 0 11-1.414 1.414L5.336 12l9.207-9.207a1 1 0 011.414 0z" />
                            </svg>
                        </button>
                        <button className="nav-button" onClick={() => window.history.forward()}>
                            <svg viewBox="0 0 24 24" width="22" height="22">
                                <path fill="currentColor" d="M8.043 2.793a1 1 0 000 1.414L15.836 12l-7.793 7.793a1 1 0 101.414 1.414L18.664 12 9.457 2.793a1 1 0 00-1.414 0z" />
                            </svg>
                        </button>
                    </div>

                    <div className="user-controls">
                        <div className="user-dropdown">
                            <div className="user-avatar">
                                {userAvatar ? (
                                    <img src={userAvatar} alt={userName} />
                                ) : (
                                    <svg viewBox="0 0 16 16" width="16" height="16">
                                        <path fill="white" d="M8 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                )}
                            </div>
                            <span className="user-name">{userName}</span>
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M14 6l-6 6-6-6h12z" />
                            </svg>

                            <div className="dropdown-menu">
                                <div className="dropdown-item" onClick={() => navigate('/profile')}>Profile</div>
                                <div className="dropdown-item" onClick={() => navigate('/settings')}>Settings</div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item logout" onClick={handleLogout}>
                                    Log out
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="main-content">
                    <div className="desktop-greeting">
                        <h1 className="greeting-title">{greeting}</h1>
                    </div>

                    <div className="top-row-grid">
                        {topPlaylists.map(playlist => (
                            <div
                                key={playlist.id}
                                className="top-row-item"
                                onClick={() => handlePlaylistSelect(playlist)}
                            >
                                <div className="playlist-image">
                                    <ImageWithFallback
                                        src={playlist.images?.[0]?.url}
                                        alt={playlist.name}
                                        className="playlist-cover"
                                    />
                                </div>
                                <span>{playlist.name}</span>
                                <div
                                    className="play-icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayPlaylist(playlist);
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="white" d="M8 5.14v14l11-7-11-7z" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>

                    <SmartGrouping
                        onPlayTrack={handlePlayTrack}
                        currentlyPlayingTrack={currentlyPlayingTrack?.id}
                        isPlaying={isPlaying}
                        player={player}
                        deviceId={deviceId}
                        isPremium={isPremium}
                        isDeviceReady={isDeviceReady}
                        onTrackChange={handleTrackChange}
                    />

                    <div className="section-header">
                        <h2>Your Playlists</h2>
                        <button className="see-all">SEE ALL</button>
                    </div>

                    {allPlaylists.length > 0 ? (
                        <div className="playlist-grid">
                            {allPlaylists.map(playlist => (
                                <PlaylistCard
                                    key={playlist.id}
                                    playlist={playlist}
                                    onSelect={() => handlePlaylistSelect(playlist)}
                                    onPlay={() => handlePlayPlaylist(playlist)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-playlists">
                            <div className="empty-icon">🎵</div>
                            <h3>No playlists found</h3>
                            <p>Create playlists in Spotify to see them here</p>
                            <a
                                href="https://open.spotify.com/collection/playlists"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="spotify-link-button"
                            >
                                Open Spotify
                            </a>
                        </div>
                    )}
                </div>
            </main>

            {/* Enhanced Mini Player Footer */}
            <footer className="mini-player">
                {/* Progress Bar */}
                <div className="mini-player-progress">
                    <div className="progress-bar">
                        <span className="progress-time">{formatTime(currentPosition)}</span>
                        <div className="progress-slider" onClick={handleProgressClick}>
                            <div className="progress-completed" style={{ width: `${progress}%` }}>
                                <div className="progress-thumb"></div>
                            </div>
                        </div>
                        <span className="progress-time">
                            {currentlyPlayingTrack ? formatTime(currentlyPlayingTrack.duration_ms) : formatTime(duration)}
                        </span>
                    </div>
                </div>

                <div className="mini-player-content">
                    <div className="mini-player-track">
                        <div className="mini-player-image">
                            {currentlyPlayingTrack ? (
                                <img
                                    src={
                                        currentlyPlayingTrack.album?.images?.[0]?.url ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            currentlyPlayingTrack.artists?.[0]?.name || currentlyPlayingTrack.name
                                        )}&background=6c2dc7&color=fff&size=56&bold=true&rounded=true`
                                    }
                                    alt={currentlyPlayingTrack.album?.name || "Album artwork"}
                                />
                            ) : (
                                <div className="mini-player-placeholder">
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" fill="#6c2dc7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="mini-player-info">
                            <div className="mini-player-title">
                                {currentlyPlayingTrack ? currentlyPlayingTrack.name : 'Select a track'}
                                {isPremium && (
                                    <span className="premium-indicator" title="Premium Quality">
                                        <svg viewBox="0 0 16 16" width="12" height="12">
                                            <path fill="#6c2dc7" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                                        </svg>
                                    </span>
                                )}
                            </div>
                            <div className="mini-player-artist">
                                {currentlyPlayingTrack ? 
                                    currentlyPlayingTrack.artists.map(artist => artist.name).join(', ') : 
                                    'to start playing'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="mini-player-controls">
                        <button className="mini-player-like" title="Like">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M1.69 2A4.582 4.582 0 008 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z" />
                            </svg>
                        </button>
                        
                        <div className="mini-player-main-controls">
                            <button className="mini-player-prev" onClick={handlePreviousTrack} title="Previous">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.588a.7.7 0 01-1.05.606L4 8.149V13.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z" />
                                </svg>
                            </button>
                            
                            <button className="mini-player-play" onClick={handlePlayPauseClick} title={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying ? (
                                    <svg viewBox="0 0 16 16" width="16" height="16">
                                        <path fill="currentColor" d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 16 16" width="16" height="16">
                                        <path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z" fill="currentColor" />
                                    </svg>
                                )}
                            </button>
                            
                            <button className="mini-player-next" onClick={handleNextTrack} title="Next">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.588a.7.7 0 001.05.606L12 8.149V13.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z" />
                                </svg>
                            </button>
                        </div>
                        
                        <button className="mini-player-shuffle" title="Shuffle">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </footer>

            {/* Device Status Indicator */}
            {(isPremium && !isDeviceReady) || isReconnecting ? (
                <div className="device-reconnecting">
                    <svg viewBox="0 0 16 16" width="16" height="16" className="spinner">
                        <path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 7.5h-2v2a.5.5 0 01-1 0v-2h-2a.5.5 0 010-1h2v-2a.5.5 0 011 0v2h2a.5.5 0 010 1z" />
                    </svg>
                    <span>{isReconnecting ? 'Reconnecting device...' : 'Reconnecting player...'}</span>
                </div>
            ) : null}
        </div>
    );
};

export default Dashboard;