import React, { useEffect, useState, useCallback } from 'react';
import { fetchPlaylists, fetchPlaylistTracks, fetchAudioFeatures } from '../../api/spotify';
import { groupTracks } from '../../utils/groupingAlgorithm';
import { groupTracksByVibe } from '../../utils/vibeAnalyzer';
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
    
    // Extract tracks from playlists with enhanced error handling
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
                                    allTracks.push({
                                        id: item.track.id,
                                        name: item.track.name || 'Unknown Track',
                                        artist: item.track.artists?.[0]?.name || 'Unknown Artist',
                                        genre: 'Unknown',
                                        language: 'Unknown',
                                        energy: 0.5,
                                        tempo: 120,
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
                
                console.log("Extracted all tracks:", allTracks.length, allTracks[0] || 'No tracks found');
                
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
            } catch (err) {
                console.error("Fatal error loading tracks:", err);
                setError('Failed to load your tracks. Please try again later.');
                setTracks([]);
            } finally {
                if (playlists.length > 0 && tracks.length === 0) {
                    setLoading(false);
                }
            }
        };
        
        loadAllTracks();
    }, [playlists, accessToken]);
    
    // Fetch audio features with robust error handling
    useEffect(() => {
        const getTrackFeatures = async () => {
            if (tracks.length === 0) {
                setLoading(false);
                return;
            }
            
            try {
                // Skip audio features completely if we've seen 403 before
                const skipAudioFeatures = localStorage.getItem('skipAudioFeatures') === 'true';
                
                if (skipAudioFeatures) {
                    console.warn('Skipping audio features due to previous 403 error');
                    setLoading(false);
                    return;
                }
                
                // Get track IDs (limit to 100 at a time per Spotify API requirements)
                const trackIds = tracks.slice(0, 100).map(track => track.id);
                
                // Enhanced approach with better error reporting
                console.log(`Fetching audio features for ${trackIds.length} tracks`);
                
                let audioFeatures: any[] = [];
                
                try {
                    // Fetch audio features
                    const audioFeaturesData = await fetchAudioFeatures(accessToken, trackIds);
                    audioFeatures = audioFeaturesData?.audio_features || [];
                } catch (apiError) {
                    console.error("Audio features API error:", apiError);
                    
                    // Store a flag to skip future attempts if we got a 403
                    if (apiError instanceof Error && apiError.message.includes('403')) {
                        localStorage.setItem('skipAudioFeatures', 'true');
                        console.warn('Setting flag to skip future audio features requests');
                    }
                }
                
                // Always proceed with enhancing tracks, with or without features
                const enhancedTracks = tracks.map(track => {
                    const features = audioFeatures.find(
                        feature => feature && feature.id === track.id
                    ) || {};
                    
                    return {
                        ...track,
                        energy: typeof features.energy === 'number' ? features.energy : 0.5,
                        tempo: typeof features.tempo === 'number' ? features.tempo : 120,
                    };
                });
                
                setTracks(enhancedTracks);
            } catch (err) {
                console.error("Error processing track features:", err);
                
                // Create tracks with default values as fallback
                const tracksWithDefaults = tracks.map(track => ({
                    ...track,
                    energy: 0.5,
                    tempo: 120
                }));
                setTracks(tracksWithDefaults);
            } finally {
                setLoading(false);
            }
        };
        
        getTrackFeatures();
    }, [tracks.length > 0 ? tracks[0].id : null, accessToken]);
    
    // Simplified grouping function with error protection
    const performGrouping = useCallback(() => {
        if (tracks.length === 0) return;
        
        try {
            let groupedResults: Record<string, TrackMetadata[]> = {};
            
            if (criteria === 'vibe') {
                groupedResults = groupTracksByVibe(tracks);
            } else {
                groupedResults = groupTracks(tracks, criteria);
            }
            
            const groupCount = Object.keys(groupedResults).length;
            console.log(`Grouped ${tracks.length} tracks by ${criteria}: ${groupCount} groups`);
            
            if (groupCount === 0) {
                console.warn(`No groups created using criteria: ${criteria}`);
            }
            
            setGroupedTracks(groupedResults);
        } catch (err) {
            console.error(`Error grouping by ${criteria}:`, err);
            setError(`Failed to group tracks by ${criteria}`);
            setGroupedTracks({});
        }
    }, [tracks, criteria]);
    
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
        localStorage.removeItem('skipAudioFeatures');
        fetchUserPlaylists();
    };
    
    return (
        <div className="smart-grouping">
            <div className="smart-grouping-header">
                <h2 className="smart-grouping-title">Smart Grouping</h2>
                {error && (
                    <div className="error-banner">
                        <p>{error}</p>
                        <button onClick={handleRetry} className="retry-button">Retry</button>
                    </div>
                )}
            </div>
            
            <div className="grouping-options">
                <h3>Group by:</h3>
                <label className="option-label">
                    <input 
                        type="radio" 
                        name="criteria"
                        checked={criteria === 'artist'}
                        onChange={() => setCriteria('artist')} 
                    /> Artist
                </label>
                <label className="option-label">
                    <input 
                        type="radio" 
                        name="criteria"
                        checked={criteria === 'genre'}
                        onChange={() => setCriteria('genre')} 
                    /> Genre
                </label>
                <label className="option-label">
                    <input 
                        type="radio" 
                        name="criteria"
                        checked={criteria === 'language'}
                        onChange={() => setCriteria('language')} 
                    /> Language
                </label>
                <label className="option-label">
                    <input 
                        type="radio" 
                        name="criteria"
                        checked={criteria === 'vibe'}
                        onChange={() => setCriteria('vibe')} 
                    /> Vibe
                </label>
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
                                        <span className="play-icon">▶</span>
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
    );
};

export default SmartGrouping;
