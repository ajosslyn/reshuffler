import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserPlaylists, getPlaylistTracks } from '../../api/spotifyService';
import { groupTracks } from '../../utils/groupingAlgorithm';
import { estimateAudioFeatures } from '../../utils/audioFeatureEstimator';
import { TrackMetadata } from '../../types/app.types';
import './SmartGrouping.css';
import { groupTracksByVibe } from '../../utils/vibeAnalyzer';

// Update the props interface to accept SDK-related props from Dashboard
interface SmartGroupingProps {
    onPlayTrack?: (track: any) => void;
    currentlyPlayingTrack?: string | null;
    isPlaying?: boolean;
    // Add these new props
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
    const [tracks, setTracks] = useState<TrackMetadata[]>([]);
    const [groupedTracks, setGroupedTracks] = useState<Record<string, TrackMetadata[]>>({});
    const [accessToken, setAccessToken] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<string>('artist'); // Default grouping criteria

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

    

    // 1. First define processTracksData
    const processTracksData = useCallback((tracksData: any) => {
        if (tracksData?.items) {
            console.log(`Processing ${tracksData.items.length} tracks`);
            setTracks([]); // Clear tracks

            tracksData.items.forEach((item: any, index: number) => {
                if (item?.track) {
                    // Process track and add to state
                    console.log(`Processing track ${index + 1}/${tracksData.items.length}`);
                    // Create basic track
                    const track = {
                        id: item.track.id,
                        name: item.track.name || 'Unknown Track',
                        artist: item.track.artists?.[0]?.name || 'Unknown Artist',
                        genre: 'Unknown',
                        language: 'Unknown',
                        energy: 0.5, // Default
                        tempo: 120, // Default
                    };

                    // Apply audio feature estimation
                    const estimatedFeatures = estimateAudioFeatures(track);

                    // Create enhanced track with estimated features
                    setTracks(prevTracks => [
                        ...prevTracks,
                        {
                            ...track,
                            energy: estimatedFeatures.energy ?? track.energy ?? 0.5, // Default to 0.5 if undefined
                            tempo: estimatedFeatures.tempo ?? track.tempo ?? 120,    // Default to 120 if undefined
                            genre: estimatedFeatures.genre || track.genre || 'Unknown',
                            language: estimatedFeatures.language || track.language || 'Unknown'
                        }
                    ]);
                }
            });

            console.log("Finished processing tracks");
        } else {
            console.warn("No tracks found in the response", tracksData);
        }
    }, [setTracks]); // Add setTracks as dependency

    // 2. Then define fetchUserPlaylists which uses processTracksData
    const fetchUserPlaylists = useCallback(async () => {
        try {
            setLoading(true);

            // Check if token exists and log its format
            console.log("Token exists:", !!accessToken);
            console.log("Token format:", accessToken ? `${accessToken.substring(0, 10)}...` : "none");

            if (!accessToken) {
                setError('No access token available');
                setLoading(false);
                return;
            }

            const playlistsData = await getUserPlaylists();
            console.log("Playlists data:", playlistsData);

            if (!playlistsData || !playlistsData.items || !playlistsData.items.length) {
                setError('No playlists found in your account');
                setLoading(false);
                return;
            }

            const selectedPlaylist = playlistsData.items[0];
            console.log("Selected playlist:", selectedPlaylist);

            if (selectedPlaylist) {
                const tracksData = await getPlaylistTracks(selectedPlaylist.id);
                console.log("Tracks data:", tracksData);
                processTracksData(tracksData);
            }

            setLoading(false);
        } catch (error) {
            console.error("Playlist fetch error details:", error);
            setError(`Failed to load playlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
        }
    }, [processTracksData, accessToken]); // Include both dependencies

    useEffect(() => {
        fetchUserPlaylists();
    }, [fetchUserPlaylists]);

    // Add this function to memoize track processing
    const processedTracks = useMemo(() => {
        console.log("Processing tracks...");
        if (tracks.length === 0) return [];

        return tracks.map(track => {
            // Apply audio feature estimation only once per track
            const estimatedFeatures = estimateAudioFeatures(track);

            return {
                ...track,
                // Provide default values to ensure properties are never undefined
                energy: estimatedFeatures.energy ?? track.energy ?? 0.5,
                tempo: estimatedFeatures.tempo ?? track.tempo ?? 120,
                genre: estimatedFeatures.genre || track.genre || 'Unknown',
                language: estimatedFeatures.language || track.language || 'Unknown'
            };
        });
    }, [tracks]); // Include the entire tracks array

    // Update the performGrouping function to use the memoized tracks
    const performGrouping = useCallback(() => {
        if (processedTracks.length === 0) return;

        try {
            let groupedResults: Record<string, TrackMetadata[]> = {};

            if (criteria === 'vibe') {
                groupedResults = groupTracksByVibe(processedTracks);
            } else {
                groupedResults = groupTracks(processedTracks, criteria);
            }

            const groupCount = Object.keys(groupedResults).length;
            console.log(`Grouped ${processedTracks.length} tracks by ${criteria}: ${groupCount} groups`);

            if (groupCount === 0) {
                console.warn(`No groups created using criteria: ${criteria}`);
            }

            setGroupedTracks(groupedResults);
        } catch (err) {
            console.error(`Error grouping by ${criteria}:`, err);
            setError(`Failed to group tracks by ${criteria}`);
            setGroupedTracks({});
        }
    }, [processedTracks, criteria]);

    // Group tracks based on selected criteria
    useEffect(() => {
        performGrouping();
    }, [performGrouping]);

    // Reset error when changing criteria
    useEffect(() => {
        setError(null);
    }, [criteria]);

    // Retry function for users
    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchUserPlaylists();
    };

    // Update the handlePlayTrack function to use the SDK directly when available
    const handlePlayTrack = (track: TrackMetadata) => {
        // Get a unique avatar based on artist and track name for better recognition
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(track.artist + ' ' + track.name)}&background=6c2dc7&color=fff&size=300&bold=true&rounded=true`;

        // Convert TrackMetadata to format expected by Dashboard's handlePlayTrack
        const fullTrack = {
            id: track.id,
            name: track.name,
            artists: [{ name: track.artist }],
            album: {
                name: track.genre || "Unknown Album",
                images: [{ url: avatarUrl }]
            },
            duration_ms: 30000, // Default 30 seconds for preview
            preview_url: track.preview_url || `https://p.scdn.co/mp3-preview/${track.id}`
        };

        // Use SDK player directly if available
        if (isPremium && deviceId && player && isDeviceReady) {
            console.log('Using SDK to play track:', track.id);

            // Import playTrackOnDevice from spotify.ts and use it directly
            import('../../api/spotify').then(({ playTrackOnDevice }) => {
                playTrackOnDevice(`spotify:track:${track.id}`, deviceId)
                    .then(() => {
                        console.log('Track playback started via SDK');
                    })
                    .catch(err => {
                        console.error('Error playing track via SDK:', err);

                        // Fall back to parent component's handler
                        if (onPlayTrack) {
                            onPlayTrack(fullTrack);
                        }
                    });
            });
        } else {
            // Fall back to parent component's handler
            if (onPlayTrack) {
                onPlayTrack(fullTrack);
            }
        }
    };

    useEffect(() => {
        // Add touch handling for mobile devices
        const trackItems = document.querySelectorAll('.track-item');

        // Process each track item
        trackItems.forEach(item => {
            // Add active state styling for touch feedback
            item.addEventListener('touchstart', () => {
                item.classList.add('track-touch-active');
            });

            item.addEventListener('touchend', () => {
                item.classList.remove('track-touch-active');
                setTimeout(() => item.classList.remove('track-touch-active'), 200);
            });

            item.addEventListener('touchcancel', () => {
                item.classList.remove('track-touch-active');
            });
        });

        // Handle horizontal scroll for tabs on mobile
        const tabContainer = document.querySelector('.tab-buttons') as HTMLDivElement;
        if (tabContainer && window.innerWidth <= 768) {
            // Automatically scroll to active tab
            const activeTab = tabContainer.querySelector('.active') as HTMLButtonElement;
            if (activeTab) {
                setTimeout(() => {
                    const containerWidth = tabContainer.offsetWidth;
                    const tabWidth = activeTab.offsetWidth;
                    const tabLeft = activeTab.offsetLeft;

                    // Center the active tab
                    tabContainer.scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
                }, 100);
            }
        }

        return () => {
            // Cleanup touch listeners if needed
            trackItems.forEach(item => {
                item.removeEventListener('touchstart', () => { });
                item.removeEventListener('touchend', () => { });
                item.removeEventListener('touchcancel', () => { });
            });
        };
    }, [criteria]); // Re-run when grouping changes

    useEffect(() => {
        // Check if device is ready when component mounts
        if (isPremium && !isDeviceReady && player) {
            console.log('Reconnecting device for SmartGrouping playback...');
            player.connect().then((success: boolean) => {
                if (success) {
                    console.log('Device reconnected successfully');
                } else {
                    console.error('Failed to reconnect device');
                }
            });
        }
    }, [isPremium, isDeviceReady, player]);

    return (
        <div className="smart-grouping">
            <div className="smart-grouping-header">
                <h2 className="smart-grouping-title">Smart Grouping</h2>
            </div>

            <div className="smart-grouping-content">
                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                        <button onClick={handleRetry} className="retry-button">Retry</button>
                    </div>
                )}

                {/* Refactored tab interface for criteria selection */}
                <div className="grouping-tabs">
                    <span className="grouping-label">Group by:</span>
                    <div className="tab-buttons">
                        <button
                            className={`tab-button ${criteria === 'artist' ? 'active' : ''}`}
                            onClick={() => setCriteria('artist')}
                        >
                            Artist
                        </button>
                        <button
                            className={`tab-button ${criteria === 'genre' ? 'active' : ''}`}
                            onClick={() => setCriteria('genre')}
                        >
                            Genre
                        </button>
                        <button
                            className={`tab-button ${criteria === 'language' ? 'active' : ''}`}
                            onClick={() => setCriteria('language')}
                        >
                            Language
                        </button>
                        <button
                            className={`tab-button ${criteria === 'vibe' ? 'active' : ''}`}
                            onClick={() => setCriteria('vibe')}
                        >
                            Vibe
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-groups">
                        <div className="loading-spinner"></div>
                    </div>
                ) : Object.keys(groupedTracks).length === 0 ? (
                    <div className="empty-group">
                        <div className="empty-group-icon">📂</div>
                        <p>{error || 'No tracks found or no grouping criteria selected.'}</p>
                        {!error && <button onClick={handleRetry} className="retry-button">Refresh</button>}
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
                                    {groupTracks.slice(0, 20).map((track, index) => (
                                        <li
                                            key={`${track.id}-${index}`}
                                            className={`track-item ${currentlyPlayingTrack === track.id ? 'playing' : ''}`}
                                            onClick={() => handlePlayTrack(track)}
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
                                            <span className="track-title">{track.name}</span>
                                            <span className="track-artist">{track.artist}</span>
                                        </li>
                                    ))}
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
