import React, { useEffect, useState, useCallback } from 'react';
import { getUserPlaylists, getPlaylistTracks } from '../../api/spotifyService';
import ImageWithFallback from '../common/ImageWithFallback';
import './SmartGrouping.css';

// Import the new enhanced services - FIXED IMPORTS
import { Track } from '../../types/spotify.types';
import EnhancedMusicAnalyzer, { EnhancedTrackData } from '../../services/enhancedMusicAnalyzer';
import { AdvancedPlaylistGrouper } from '../../utils/enhancedGrouping';

// Update the props interface to accept SDK-related props from Dashboard
interface SmartGroupingProps {
    onPlayTrack?: (track: any) => void;
    currentlyPlayingTrack?: string | null;
    isPlaying?: boolean;
    player?: any;
    deviceId?: string;
    isPremium?: boolean;
    isDeviceReady?: boolean;
    // Add new props for track navigation
    onTrackChange?: (tracks: Track[], currentIndex: number) => void;
}

const SmartGrouping: React.FC<SmartGroupingProps> = ({
    onPlayTrack,
    currentlyPlayingTrack,
    isPlaying,
    player,
    deviceId,
    isPremium,
    isDeviceReady,
    onTrackChange
}) => {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [enhancedTracks, setEnhancedTracks] = useState<EnhancedTrackData[]>([]);
    const [groupedTracks, setGroupedTracks] = useState<Record<string, EnhancedTrackData[]>>({});
    const [accessToken, setAccessToken] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<string>('intelligent'); // Default to intelligent grouping
    const [analysisProgress, setAnalysisProgress] = useState<number>(0);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [fetchProgress, setFetchProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });

    // Initialize enhanced services
    const [musicAnalyzer] = useState(() => {
        const lastFmApiKey = import.meta.env.VITE_LASTFM_API_KEY;
        if (!lastFmApiKey) {
            console.warn('Last.fm API key not found. Enhanced features will be limited.');
            return null;
        }
        return new EnhancedMusicAnalyzer(lastFmApiKey);
    });

    const [playlistGrouper] = useState(() => new AdvancedPlaylistGrouper());

    // Get access token from localStorage
    useEffect(() => {
        const token = localStorage.getItem('accessToken') || '';
        console.log("Token available:", !!token, "First 10 chars:", token.substring(0, 10));
        setAccessToken(token);
        if (!token) {
            setError('No access token available. Please log in again.');
            setLoading(false);
        }
    }, []);

    // Convert Spotify track data to our Track interface
    const convertToTrack = (spotifyTrack: any): Track => {
        return {
            id: spotifyTrack.id,
            name: spotifyTrack.name || 'Unknown Track',
            artist: spotifyTrack.artists?.[0]?.name || 'Unknown Artist',
            album: spotifyTrack.album?.name || 'Unknown Album',
            genre: 'Unknown', // Will be enhanced by Last.fm
            tempo: 120, // Default, will be enhanced
            language: 'Unknown', // Will be enhanced
            duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000),
            albumArt: spotifyTrack.album?.images?.[0]?.url || ''
        };
    };

    // Enhanced track analysis with progress tracking
    const analyzeTracksWithProgress = useCallback(async (tracksToAnalyze: Track[]) => {
        if (!musicAnalyzer) {
            console.warn('Music analyzer not available. Using basic grouping.');
            return tracksToAnalyze.map(track => ({
                track,
                enhancedGenres: [track.genre].filter(Boolean),
                moodScore: 0.5,
                energyLevel: 'medium' as const,
                vibeCategories: ['general'],
                danceability: 0.5,
                popularityScore: 0.5
            }));
        }

        setIsAnalyzing(true);
        setAnalysisProgress(0);

        try {
            const results: EnhancedTrackData[] = [];
            const batchSize = 3;
            
            for (let i = 0; i < tracksToAnalyze.length; i += batchSize) {
                const batch = tracksToAnalyze.slice(i, i + batchSize);
                
                const batchResults = await Promise.all(
                    batch.map(track => musicAnalyzer.analyzeTrack(track))
                );
                
                results.push(...batchResults);
                
                // Update progress
                const progress = Math.round((results.length / tracksToAnalyze.length) * 100);
                setAnalysisProgress(progress);
                
                // Small delay between batches
                if (i + batchSize < tracksToAnalyze.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            console.log(`🎉 Enhanced analysis complete! Processed ${results.length} tracks`);
            return results;
        } catch (error) {
            console.error('Error during enhanced analysis:', error);
            // Fallback to basic analysis
            return tracksToAnalyze.map(track => ({
                track,
                enhancedGenres: [track.genre].filter(Boolean),
                moodScore: 0.5,
                energyLevel: 'medium' as const,
                vibeCategories: ['general'],
                danceability: 0.5,
                popularityScore: 0.5
            }));
        } finally {
            setIsAnalyzing(false);
            setAnalysisProgress(0);
        }
    }, [musicAnalyzer]);

    // Fetch user playlists and all their tracks
    const fetchUserPlaylists = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            if (!accessToken) {
                setError('No access token available');
                setLoading(false);
                return;
            }

            const playlistsData = await getUserPlaylists();
            console.log("Playlists data:", playlistsData);

            if (!playlistsData?.items?.length) {
                setError('No playlists found in your account');
                setLoading(false);
                return;
            }

            console.log(`Found ${playlistsData.items.length} playlists. Fetching tracks from all playlists...`);

            // Initialize progress tracking
            setFetchProgress({ current: 0, total: playlistsData.items.length });

            // Fetch tracks from all playlists
            const allTracks: Track[] = [];
            let processedPlaylists = 0;

            for (const playlist of playlistsData.items) {
                try {
                    console.log(`Fetching tracks from playlist: ${playlist.name}`);
                    const tracksData = await getPlaylistTracks(playlist.id);
                    
                    if (tracksData?.items) {
                        tracksData.items.forEach((item: any) => {
                            if (item?.track && item.track.id) {
                                const track = convertToTrack(item.track);
                                // Add playlist info to track for better grouping
                                track.playlistName = playlist.name;
                                track.playlistId = playlist.id;
                                allTracks.push(track);
                            }
                        });
                    }
                    
                    processedPlaylists++;
                    setFetchProgress({ current: processedPlaylists, total: playlistsData.items.length });
                    console.log(`Processed ${processedPlaylists}/${playlistsData.items.length} playlists`);
                    
                    // Small delay to avoid rate limiting
                    if (processedPlaylists < playlistsData.items.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                } catch (playlistError) {
                    console.error(`Error fetching tracks from playlist ${playlist.name}:`, playlistError);
                    // Continue with other playlists
                    processedPlaylists++;
                    setFetchProgress({ current: processedPlaylists, total: playlistsData.items.length });
                }
            }

            console.log(`Successfully fetched ${allTracks.length} tracks from ${processedPlaylists} playlists`);
            setTracks(allTracks);
            setLoading(false);
        } catch (error) {
            console.error("Playlist fetch error details:", error);
            setError(`Failed to load playlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
        }
    }, [accessToken]);

    // Analyze tracks when they change
    useEffect(() => {
        if (tracks.length > 0) {
            analyzeTracksWithProgress(tracks).then(enhanced => {
                setEnhancedTracks(enhanced);
            });
        }
    }, [tracks, analyzeTracksWithProgress]);

    // Group enhanced tracks based on selected criteria
    const performEnhancedGrouping = useCallback(() => {
        if (enhancedTracks.length === 0) return;

        try {
            let groupedResults: Record<string, EnhancedTrackData[]> = {};

            if (criteria === 'intelligent') {
                // Use the new cross-playlist intelligent grouping
                groupedResults = playlistGrouper.createCrossPlaylistGroups(enhancedTracks);
            } else {
                // Basic grouping for backwards compatibility
                const basicGrouper = new Map<string, EnhancedTrackData[]>();
                
                enhancedTracks.forEach(enhanced => {
                    let key = 'Unknown';
                    
                    switch (criteria) {
                        case 'artist':
                            key = enhanced.track.artist;
                            break;
                        case 'genre':
                            key = enhanced.enhancedGenres[0] || enhanced.track.genre || 'Unknown';
                            break;
                        case 'playlist':
                            key = enhanced.track.playlistName || 'Unknown Playlist';
                            break;
                        case 'energy':
                            key = `${enhanced.energyLevel.charAt(0).toUpperCase() + enhanced.energyLevel.slice(1)} Energy`;
                            break;
                        case 'mood':
                            if (enhanced.moodScore > 0.7) key = 'Happy';
                            else if (enhanced.moodScore < 0.3) key = 'Sad';
                            else key = 'Neutral';
                            break;
                        default:
                            key = enhanced.track.genre || 'Unknown';
                    }
                    
                    if (!basicGrouper.has(key)) {
                        basicGrouper.set(key, []);
                    }
                    basicGrouper.get(key)!.push(enhanced);
                });
                
                groupedResults = Object.fromEntries(basicGrouper);
            }

            const groupCount = Object.keys(groupedResults).length;
            console.log(`✨ Grouped ${enhancedTracks.length} tracks by ${criteria}: ${groupCount} groups`);

            setGroupedTracks(groupedResults);
        } catch (err) {
            console.error(`Error grouping by ${criteria}:`, err);
            setError(`Failed to group tracks by ${criteria}`);
            setGroupedTracks({});
        }
    }, [enhancedTracks, criteria, playlistGrouper]);

    // Group tracks when enhanced tracks or criteria change
    useEffect(() => {
        performEnhancedGrouping();
    }, [performEnhancedGrouping]);

    // Initial fetch
    useEffect(() => {
        fetchUserPlaylists();
    }, [fetchUserPlaylists]);

    // Reset error when changing criteria
    useEffect(() => {
        setError(null);
    }, [criteria]);

    // Retry function
    const handleRetry = () => {
        setError(null);
        setLoading(true);
        setFetchProgress({ current: 0, total: 0 });
        setTracks([]);
        setEnhancedTracks([]);
        setGroupedTracks({});
        fetchUserPlaylists();
    };

    // Enhanced play track function
    const handlePlayTrack = (enhancedTrack: EnhancedTrackData) => {
        const track = enhancedTrack.track;
        
        // Create track list for navigation
        const allTracks = Object.values(groupedTracks).flat();
        const trackList = allTracks.map(et => et.track);
        const currentIndex = trackList.findIndex(t => t.id === track.id);
        
        // Communicate track context to Dashboard for navigation
        if (onTrackChange) {
            onTrackChange(trackList, currentIndex);
        }
        
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(track.artist + ' ' + track.name)}&background=6c2dc7&color=fff&size=300&bold=true&rounded=true`;

        const fullTrack = {
            id: track.id,
            name: track.name,
            artists: [{ name: track.artist }],
            album: {
                name: track.album,
                images: [{ url: avatarUrl }]
            },
            duration_ms: track.duration * 1000,
            preview_url: undefined // SmartGrouping tracks don't have preview URLs
        };

        console.log('SmartGrouping: Playing track:', fullTrack.id, fullTrack.name);

        // Check if this is a premium user for proper playback
        if (!isPremium && !fullTrack.preview_url) {
            console.warn('SmartGrouping: No preview URL available for non-premium user');
            alert('This track is not available for preview. Please upgrade to Premium for full track playback.');
            return;
        }

        // Always update Dashboard state first for immediate UI feedback
        if (onPlayTrack) {
            onPlayTrack(fullTrack);
        }

        if (isPremium && deviceId && player && isDeviceReady) {
            console.log('SmartGrouping: Using SDK to play track:', track.id);
            
            import('../../api/spotify').then(({ playTrackOnDevice, transferPlaybackToDevice }) => {
                // First, try to transfer playback to ensure device is active
                transferPlaybackToDevice(deviceId)
                    .then(() => {
                        console.log('SmartGrouping: Device activated, playing track');
                        return playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
                    })
                    .then(() => {
                        console.log('SmartGrouping: Track playback started via SDK');
                        // State should be updated via SDK player state listener
                    })
                    .catch(err => {
                        console.error('SmartGrouping: Error playing track via SDK:', err);
                        
                        // Check if it's a device_not_found error
                        if (err.message?.includes('device_not_found')) {
                            console.log('SmartGrouping: Device not found, trying to reconnect...');
                            
                            // Try to reconnect the device
                            if (player && player.activateElement) {
                                player.activateElement().then(() => {
                                    console.log('SmartGrouping: Device reconnected, retrying playback');
                                    return transferPlaybackToDevice(deviceId);
                                }).then(() => {
                                    return playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
                                }).then(() => {
                                    console.log('SmartGrouping: Track playback started after reconnection');
                                }).catch((reconnectErr: any) => {
                                    console.error('SmartGrouping: Failed to reconnect device:', reconnectErr);
                                    // Fallback to preview mode handled by Dashboard
                                });
                            } else {
                                console.warn('SmartGrouping: Cannot reconnect device, no activateElement method');
                                // Fallback to preview mode handled by Dashboard
                            }
                        } else {
                            // Other errors, fallback to preview mode handled by Dashboard
                            console.log('SmartGrouping: Non-device error, falling back to Dashboard handling');
                        }
                    });
            });
        } else {
            console.log('SmartGrouping: Playing track in preview mode');
        }
    };

    // Handle tab scrolling on mobile
    const scrollToActiveTab = useCallback((tabElement: HTMLElement) => {
        if (window.innerWidth <= 768) {
            const tabsContainer = tabElement.closest('.grouping-tabs');
            if (tabsContainer) {
                const containerRect = tabsContainer.getBoundingClientRect();
                const tabRect = tabElement.getBoundingClientRect();
                const scrollLeft = tabsContainer.scrollLeft;
                
                // Calculate the position to center the tab
                const tabCenter = tabRect.left + tabRect.width / 2;
                const containerCenter = containerRect.left + containerRect.width / 2;
                const scrollTo = scrollLeft + (tabCenter - containerCenter);
                
                tabsContainer.scrollTo({
                    left: scrollTo,
                    behavior: 'smooth'
                });
            }
        }
    }, []);

    // Enhanced criteria change handler with tab scrolling
    const handleCriteriaChange = useCallback((newCriteria: string) => {
        setCriteria(newCriteria);
        
        // Scroll to the active tab on mobile
        setTimeout(() => {
            const activeTab = document.querySelector('.tab-button.active') as HTMLElement;
            if (activeTab) {
                scrollToActiveTab(activeTab);
            }
        }, 100);
    }, [scrollToActiveTab]);

    // Enhanced grouping logic with better categorization
    const performGrouping = useCallback(async () => {
        if (enhancedTracks.length === 0) return;

        try {
            let groupedResults: Record<string, EnhancedTrackData[]> = {};

            if (criteria === 'intelligent') {
                // Use the new cross-playlist intelligent grouping
                groupedResults = playlistGrouper.createCrossPlaylistGroups(enhancedTracks);
            } else {
                // Basic grouping for backwards compatibility
                const basicGrouper = new Map<string, EnhancedTrackData[]>();
                
                enhancedTracks.forEach(enhanced => {
                    let key = 'Unknown';
                    
                    switch (criteria) {
                        case 'artist':
                            key = enhanced.track.artist;
                            break;
                        case 'genre':
                            key = enhanced.enhancedGenres[0] || enhanced.track.genre || 'Unknown';
                            break;
                        case 'playlist':
                            key = enhanced.track.playlistName || 'Unknown Playlist';
                            break;
                        case 'energy':
                            key = `${enhanced.energyLevel.charAt(0).toUpperCase() + enhanced.energyLevel.slice(1)} Energy`;
                            break;
                        case 'mood':
                            if (enhanced.moodScore > 0.7) key = 'Happy';
                            else if (enhanced.moodScore < 0.3) key = 'Sad';
                            else key = 'Neutral';
                            break;
                        default:
                            key = enhanced.track.genre || 'Unknown';
                    }
                    
                    if (!basicGrouper.has(key)) {
                        basicGrouper.set(key, []);
                    }
                    basicGrouper.get(key)!.push(enhanced);
                });
                
                groupedResults = Object.fromEntries(basicGrouper);
            }

            const groupCount = Object.keys(groupedResults).length;
            console.log(`✨ Grouped ${enhancedTracks.length} tracks by ${criteria}: ${groupCount} groups`);

            setGroupedTracks(groupedResults);
        } catch (err) {
            console.error(`Error grouping by ${criteria}:`, err);
            setError(`Failed to group tracks by ${criteria}`);
            setGroupedTracks({});
        }
    }, [enhancedTracks, criteria, playlistGrouper]);

    // Group tracks when enhanced tracks or criteria change
    useEffect(() => {
        performGrouping();
    }, [performGrouping]);

    // Initial fetch
    useEffect(() => {
        fetchUserPlaylists();
    }, [fetchUserPlaylists]);

    // Reset error when changing criteria
    useEffect(() => {
        setError(null);
    }, [criteria]);

    // Touch handling effect (same as before)
    useEffect(() => {
        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach(item => {
            item.addEventListener('touchstart', () => item.classList.add('track-touch-active'));
            item.addEventListener('touchend', () => {
                item.classList.remove('track-touch-active');
                setTimeout(() => item.classList.remove('track-touch-active'), 200);
            });
            item.addEventListener('touchcancel', () => item.classList.remove('track-touch-active'));
        });

        const tabContainer = document.querySelector('.tab-buttons') as HTMLDivElement;
        if (tabContainer && window.innerWidth <= 768) {
            const activeTab = tabContainer.querySelector('.active') as HTMLButtonElement;
            if (activeTab) {
                setTimeout(() => {
                    const containerWidth = tabContainer.offsetWidth;
                    const tabWidth = activeTab.offsetWidth;
                    const tabLeft = activeTab.offsetLeft;
                    tabContainer.scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
                }, 100);
            }
        }

        return () => {
            trackItems.forEach(item => {
                item.removeEventListener('touchstart', () => {});
                item.removeEventListener('touchend', () => {});
                item.removeEventListener('touchcancel', () => {});
            });
        };
    }, [criteria]);

    return (
        <div className="smart-grouping">
            <div className="smart-grouping-header">
                <div className="header-main">
                    <div className="header-title-section">
                        <h1 className="smart-grouping-title">
                            Smart Grouping
                        </h1>
                        <div className="header-subtitle">
                            <div className="status-section">
                                {musicAnalyzer ? (
                                    <span className="feature-status active">
                                        <span className="status-icon">🎵</span>
                                        Enhanced features enabled
                                    </span>
                                ) : (
                                    <span className="feature-status inactive">
                                        <span className="status-icon">⚠️</span>
                                        Basic features only
                                    </span>
                                )}
                            </div>
                            <div className="indicator-section">
                                <div className="grouping-indicator">
                                    <span className="indicator-text">AI-Powered</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {!musicAnalyzer && (
                    <div className="api-notice">
                        <span className="notice-icon">ℹ️</span>
                        <span className="notice-text">
                            Connect Last.fm for enhanced music analysis and grouping
                        </span>
                    </div>
                )}
            </div>

            <div className="smart-grouping-content">
                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                        <button onClick={handleRetry} className="retry-button">Retry</button>
                    </div>
                )}

                {/* Analysis Progress */}
                {isAnalyzing && (
                    <div className="analysis-progress">
                        <div className="progress-header">
                            <span>🎵 Enhancing tracks with Last.fm data...</span>
                            <span>{analysisProgress}%</span>
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${analysisProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Enhanced tab interface */}
                <div className="grouping-tabs-container">
                    <div className="grouping-tabs">
                        <div className="grouping-header">
                            <span className="grouping-label">Group by:</span>
                            {tracks.length > 0 && (
                                <div className="track-summary">
                                    <span className="track-count">{tracks.length} tracks</span>
                                    <span className="playlist-count">
                                        from {new Set(tracks.map(t => t.playlistName).filter(Boolean)).size} playlists
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="tab-buttons">
                            <button
                                className={`tab-button ${criteria === 'intelligent' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('intelligent')}
                            >
                                🧠 Smart
                            </button>
                            <button
                                className={`tab-button ${criteria === 'energy' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('energy')}
                            >
                                ⚡ Energy
                            </button>
                            <button
                                className={`tab-button ${criteria === 'mood' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('mood')}
                            >
                                😊 Mood
                            </button>
                            <button
                                className={`tab-button ${criteria === 'artist' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('artist')}
                            >
                                👨‍🎤 Artist
                            </button>
                            <button
                                className={`tab-button ${criteria === 'genre' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('genre')}
                            >
                                🎸 Genre
                            </button>
                            <button
                                className={`tab-button ${criteria === 'playlist' ? 'active' : ''}`}
                                onClick={() => handleCriteriaChange('playlist')}
                            >
                                📋 Playlist
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-groups">
                        <div className="loading-spinner"></div>
                        <p>Loading tracks from all your playlists...</p>
                        <div className="loading-details">
                            {fetchProgress.total > 0 && (
                                <div className="progress-container">
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="progress-text">
                                        {fetchProgress.current} / {fetchProgress.total} playlists processed
                                    </p>
                                </div>
                            )}
                            {isAnalyzing && (
                                <div className="analysis-progress">
                                    <p>Analyzing tracks for enhanced grouping... {analysisProgress}%</p>
                                    <div className="progress-bar">
                                        <div 
                                            className="progress-fill" 
                                            style={{ width: `${analysisProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : Object.keys(groupedTracks).length === 0 ? (
                    <div className="empty-group">
                        <div className="empty-group-icon">📂</div>
                        <p>{error || 'No tracks found or still analyzing...'}</p>
                        {!error && !isAnalyzing && (
                            <button onClick={handleRetry} className="retry-button">Refresh</button>
                        )}
                    </div>
                ) : (
                    <div className="discover-sections">
                        {Object.entries(groupedTracks).map(([groupName, groupTracks]) => (
                            <div key={groupName} className="discover-section">
                                <div className="section-header">
                                    <h2 className="section-title">{groupName}</h2>
                                    <span className="section-subtitle">{groupTracks.length} tracks</span>
                                    <button className="show-all-btn">Show all</button>
                                </div>
                                <div className="cards-container">
                                    <div className="cards-scroll">
                                        {groupTracks.slice(0, 12).map((enhancedTrack, index) => {
                                            const track = enhancedTrack.track;
                                            return (
                                                <div
                                                    key={`${track.id}-${index}`}
                                                    className={`track-card ${currentlyPlayingTrack === track.id ? 'playing' : ''}`}
                                                    onClick={() => handlePlayTrack(enhancedTrack)}
                                                >
                                                    <div className="card-image-container">
                                                        {track.albumArt ? (
                                                            <ImageWithFallback
                                                                src={track.albumArt}
                                                                alt={`${track.album} by ${track.artist}`}
                                                                className="card-image"
                                                            />
                                                        ) : (
                                                            <div className="card-image-placeholder">
                                                                <svg viewBox="0 0 24 24" width="48" height="48">
                                                                    <path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div className="card-overlay">
                                                            <button className="card-play-btn">
                                                                {currentlyPlayingTrack === track.id && isPlaying ? (
                                                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                                                        <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                                                                        <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                                                        <path fill="currentColor" d="M8 5.14v14l11-7-11-7z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                        {currentlyPlayingTrack === track.id && isPlaying && (
                                                            <div className="playing-indicator">
                                                                <span className="bar"></span>
                                                                <span className="bar"></span>
                                                                <span className="bar"></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="card-content">
                                                        <h3 className="card-title">{track.name}</h3>
                                                        <p className="card-artist">{track.artist}</p>
                                                        {track.playlistName && (
                                                            <p className="card-playlist">From {track.playlistName}</p>
                                                        )}
                                                        <div className="card-meta">
                                                            {enhancedTrack.vibeCategories.slice(0, 2).map(vibe => (
                                                                <span key={vibe} className="vibe-pill">{vibe}</span>
                                                            ))}
                                                            <span className="energy-badge">
                                                                {enhancedTrack.energyLevel === 'high' ? '🔥' : 
                                                                 enhancedTrack.energyLevel === 'medium' ? '⚡' : '😌'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartGrouping;
