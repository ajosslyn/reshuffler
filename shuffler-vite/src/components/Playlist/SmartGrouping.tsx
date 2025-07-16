import React, { useEffect, useState, useCallback } from 'react';
import { getUserPlaylists, getPlaylistTracks } from '../../api/spotifyService';
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
}

const SmartGrouping: React.FC<SmartGroupingProps> = ({
    onPlayTrack,
    currentlyPlayingTrack,
    isPlaying,
    player,
    deviceId,
    isPremium,
    isDeviceReady
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
            duration: Math.floor((spotifyTrack.duration_ms || 0) / 1000)
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
            preview_url: `https://p.scdn.co/mp3-preview/${track.id}`
        };

        if (isPremium && deviceId && player && isDeviceReady) {
            console.log('Using SDK to play track:', track.id);
            import('../../api/spotify').then(({ playTrackOnDevice }) => {
                playTrackOnDevice(`spotify:track:${track.id}`, deviceId)
                    .then(() => console.log('Track playback started via SDK'))
                    .catch(err => {
                        console.error('Error playing track via SDK:', err);
                        if (onPlayTrack) onPlayTrack(fullTrack);
                    });
            });
        } else {
            if (onPlayTrack) onPlayTrack(fullTrack);
        }
    };

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
                <h2 className="smart-grouping-title">
                    Smart Grouping {musicAnalyzer ? '🎵' : '⚠️'}
                </h2>
                {!musicAnalyzer && (
                    <p className="api-warning">
                        Enhanced features unavailable - Last.fm API key missing
                    </p>
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
                            onClick={() => setCriteria('intelligent')}
                        >
                            🧠 Smart
                        </button>
                        <button
                            className={`tab-button ${criteria === 'energy' ? 'active' : ''}`}
                            onClick={() => setCriteria('energy')}
                        >
                            ⚡ Energy
                        </button>
                        <button
                            className={`tab-button ${criteria === 'mood' ? 'active' : ''}`}
                            onClick={() => setCriteria('mood')}
                        >
                            😊 Mood
                        </button>
                        <button
                            className={`tab-button ${criteria === 'artist' ? 'active' : ''}`}
                            onClick={() => setCriteria('artist')}
                        >
                            👨‍🎤 Artist
                        </button>
                        <button
                            className={`tab-button ${criteria === 'genre' ? 'active' : ''}`}
                            onClick={() => setCriteria('genre')}
                        >
                            🎸 Genre
                        </button>
                        <button
                            className={`tab-button ${criteria === 'playlist' ? 'active' : ''}`}
                            onClick={() => setCriteria('playlist')}
                        >
                            📋 Playlist
                        </button>
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
                    <div className="track-groups-container">
                        {Object.entries(groupedTracks).map(([groupName, groupTracks]) => (
                            <div key={groupName} className="track-group">
                                <div className="track-group-header">
                                    <h3 className="track-group-title">{groupName}</h3>
                                    <span className="track-count">{groupTracks.length} tracks</span>
                                </div>
                                <ul className="track-list">
                                    {groupTracks.slice(0, 20).map((enhancedTrack, index) => {
                                        const track = enhancedTrack.track;
                                        return (
                                            <li
                                                key={`${track.id}-${index}`}
                                                className={`track-item ${currentlyPlayingTrack === track.id ? 'playing' : ''}`}
                                                onClick={() => handlePlayTrack(enhancedTrack)}
                                            >
                                                <div className="track-number">
                                                    {currentlyPlayingTrack === track.id && isPlaying ? (
                                                        <span className="now-playing-icon">
                                                            <span className="bar"></span>
                                                            <span className="bar"></span>
                                                            <span className="bar"></span>
                                                        </span>
                                                    ) : (
                                                        index + 1
                                                    )}
                                                </div>
                                                <div className="play-icon">
                                                    {currentlyPlayingTrack === track.id && isPlaying ? (
                                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                                            <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                                                            <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                                                        </svg>
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                                            <path fill="currentColor" d="M8 5.14v14l11-7-11-7z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="track-info">
                                                    <span className="track-title">{track.name}</span>
                                                    <span className="track-artist">{track.artist}</span>
                                                    {track.playlistName && (
                                                        <span className="track-playlist">📋 {track.playlistName}</span>
                                                    )}
                                                    {/* Show enhanced info */}
                                                    <div className="track-meta">
                                                        {enhancedTrack.vibeCategories.slice(0, 2).map(vibe => (
                                                            <span key={vibe} className="vibe-tag">{vibe}</span>
                                                        ))}
                                                        <span className="energy-indicator">
                                                            {enhancedTrack.energyLevel === 'high' ? '🔥' : 
                                                             enhancedTrack.energyLevel === 'medium' ? '⚡' : '😌'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                    {groupTracks.length > 20 && (
                                        <li className="track-item more-tracks">
                                            <span className="track-title">
                                                <em>And {groupTracks.length - 20} more tracks...</em>
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartGrouping;
