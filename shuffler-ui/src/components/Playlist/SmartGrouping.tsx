import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchPlaylists, fetchPlaylistTracks } from '../../api/spotify';
import { groupTracks } from '../../utils/groupingAlgorithm';
import { groupTracksByVibe } from '../../utils/vibeAnalyzer';
import { estimateAudioFeatures } from '../../utils/audioFeatureEstimator';
import { TrackMetadata } from '../../types/app.types';
import './SmartGrouping.css';

const SmartGrouping: React.FC = () => {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [tracks, setTracks] = useState<TrackMetadata[]>([]);
    const [groupedTracks, setGroupedTracks] = useState<Record<string, TrackMetadata[]>>({});
    const [accessToken, setAccessToken] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<string>('artist'); // Default grouping criteria

    // Get access token from localStorage
    useEffect(() => {
        const token = localStorage.getItem('accessToken') || '';
        setAccessToken(token);
        if (!token) {
            setError('No access token available. Please log in again.');
            setLoading(false);
        }
    }, []);

    // Fetch playlists with error handling
    const fetchUserPlaylists = useCallback(async () => {
        if (!accessToken) return;

        try {
            setLoading(true);
            setError(null);

            const data = await fetchPlaylists(accessToken);

            if (!data || !Array.isArray(data)) {
                throw new Error('Invalid playlist data received');
            }

            setPlaylists(data);

            if (data.length === 0) {
                console.warn('No playlists found for user');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch playlists';
            console.error('Error fetching playlists:', err);
            setError(`Failed to load playlists: ${errorMessage}`);
            setPlaylists([]);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchUserPlaylists();
    }, [fetchUserPlaylists]);

    // Extract tracks from playlists with enhanced error handling and feature estimation
    useEffect(() => {
        const loadAllTracks = async () => {
            if (playlists.length === 0 || !accessToken) {
                setLoading(false);
                return;
            }

            try {
                setError(null);
                const allTracks: TrackMetadata[] = [];
                let errorCount = 0;

                // Process playlists in chunks to avoid overloading the API
                for (const playlist of playlists.slice(0, 10)) { // Limit to first 10 playlists for performance
                    try {
                        const tracksData = await fetchPlaylistTracks(accessToken, playlist.id);

                        if (tracksData?.items) {
                            tracksData.items.forEach((item: any) => {
                                if (item?.track) {
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
                                    allTracks.push({
                                        ...track,
                                        energy: estimatedFeatures.energy,
                                        tempo: estimatedFeatures.tempo
                                    });
                                }
                            });
                        }
                    } catch (err) {
                        console.error(`Error fetching tracks for playlist ${playlist.id}:`, err);
                        errorCount++;
                        // Continue with other playlists even if one fails
                    }
                }

                console.log("Extracted all tracks with estimated features:", allTracks.length, allTracks[0] || 'No tracks found');

                if (allTracks.length === 0) {
                    if (errorCount > 0) {
                        setError(`Failed to load tracks from ${errorCount} playlists. Please try again later.`);
                    } else {
                        setError('No tracks found in your playlists.');
                    }
                } else if (errorCount > 0) {
                    console.warn(`Loaded tracks with ${errorCount} playlist errors`);
                }

                setTracks(allTracks);
                setLoading(false); // Set loading to false here since we're done processing
            } catch (err) {
                console.error("Fatal error loading tracks:", err);
                setError('Failed to load your tracks. Please try again later.');
                setTracks([]);
                setLoading(false);
            }
        };

        loadAllTracks();
    }, [playlists, accessToken]);

    // Add this function to memoize track processing
    const processedTracks = useMemo(() => {
        console.log("Processing tracks...");
        if (tracks.length === 0) return [];
        
        return tracks.map(track => {
            // Apply audio feature estimation only once per track
            const estimatedFeatures = estimateAudioFeatures(track);
            
            return {
                ...track,
                energy: estimatedFeatures.energy,
                tempo: estimatedFeatures.tempo,
                genre: estimatedFeatures.genre || track.genre,
                language: estimatedFeatures.language || track.language
            };
        });
    }, [tracks.length > 0 ? tracks[0].id : null]); // Only re-run when the first track changes

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
                                        <li key={`${track.id}-${index}`} className="track-item">
                                            <span className="track-number">{index + 1}</span>
                                            <span className="play-icon">
                                                <svg viewBox="0 0 24 24" width="16" height="16">
                                                    <path fill="currentColor" d="M8 5.14v14l11-7-11-7z" />
                                                </svg>
                                            </span>
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
