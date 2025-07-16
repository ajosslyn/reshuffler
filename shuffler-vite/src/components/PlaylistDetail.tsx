import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchPlaylistDetails, 
  playTrackOnDevice,
  transferPlaybackToDevice,
  checkDeviceHealth
} from '../api/spotify';
import './PlaylistDetail.css';
import ImageWithFallback from './common/ImageWithFallback';

// Add this to enable TypeScript to recognize the Spotify SDK
declare global {
  interface Window {
    Spotify?: {
      Player: any;
      [key: string]: any;
    };
  }
}


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

interface PlaylistDetails {
  id: string;
  name: string;
  description?: string;
  images?: Array<{ url: string }>;
  owner: {
    display_name: string;
  };
  followers?: {
    total: number;
  };
  tracks: {
    items: Array<{
      track: Track;
      added_at: string;
    }>;
    total: number;
  };
}

const PlaylistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [shuffledTracks, setShuffledTracks] = useState<any[]>([]);
  const [currentlyPlayingTrack, setCurrentlyPlayingTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);

  // Add these after your existing state variables
  const [deviceId, setDeviceId] = useState<string>('');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isDeviceReady, setIsDeviceReady] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Add toast notification state
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  // 1. First declare showToastMessage (ONLY ONCE)
  const showToastMessage = useCallback((message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);

  // 2. Then handlePlaybackError (ONLY ONCE)
  const handlePlaybackError = useCallback((err: any) => {
    console.error("Error playing track:", err);
    
    if (err.message && (
      err.message.includes('device is not registered') || 
      err.message.includes('device_not_found') ||
      err.message.includes('Device not found') ||
      err.message.includes('device not found') ||
      err.message.includes('Device not found or expired')
    )) {
      setIsDeviceReady(false);
      showToastMessage("Playback device disconnected. Please return to the Dashboard to reconnect.");
    } else if (err.message && err.message.includes('Premium subscription required')) {
      showToastMessage("Premium subscription required for full track playback.");
      setIsPremium(false);
    } else if (err.message && err.message.includes('rate_limit')) {
      showToastMessage("Too many requests. Please wait a moment and try again.");
    } else {
      showToastMessage("Failed to play track with Spotify Premium. Falling back to preview mode.");
      setIsPremium(false);
    }
  }, [showToastMessage]);

  // 3. Then fallbackToPreview (ONLY ONCE)
  const fallbackToPreview = useCallback((track: Track) => {
    if (!track.preview_url) return;
    
    if (currentlyPlayingTrack === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview_url;
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setCurrentlyPlayingTrack(track.id);
          })
          .catch(err => {
            console.error("Error playing track preview:", err);
            showToastMessage("Failed to play track preview.");
          });
      }
    }
  }, [currentlyPlayingTrack, isPlaying, showToastMessage]);

    // Add this function after your checkAndReconnectDevice function
  const validateDeviceAndPlayer = useCallback(async () => {
    if (!isPremium || !deviceId) return false;
    
    try {
      console.log('Validating device and player...');
      
      // Use the new checkDeviceHealth function
      const deviceHealth = await checkDeviceHealth(deviceId);
      
      if (deviceHealth.exists) {
        console.log(`Device found: ${deviceHealth.name} (${deviceHealth.type}) - Active: ${deviceHealth.isActive}`);
        setIsDeviceReady(deviceHealth.isActive || true);
        return true;
      } else {
        console.log('Device not found in available devices');
        setIsDeviceReady(false);
        return false;
      }
    } catch (error) {
      console.error('Error validating device:', error);
      setIsDeviceReady(false);
      return false;
    }
  }, [deviceId, isPremium]);

    // Improved device check and reconnection function
  const checkAndReconnectDevice = useCallback(async () => {
    if (!deviceId || !isPremium) return false;
    
    try {
      setIsReconnecting(true);
      console.log('Checking device connection...');
      
      // First validate the device exists
      const deviceValid = await validateDeviceAndPlayer();
      if (!deviceValid) {
        console.log('Device validation failed');
        showToastMessage("Device no longer available. Please return to Dashboard to reconnect.");
        return false;
      }
      
      // Try to transfer playbook to see if device is still valid
      try {
        await transferPlaybackToDevice(deviceId);
        
        // Wait a moment for the transfer to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify the transfer worked
        const verifyResponse = await fetch('https://api.spotify.com/v1/me/player', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (verifyResponse.status === 200) {
          const verifyData = await verifyResponse.json();
          if (verifyData && verifyData.device && verifyData.device.id === deviceId) {
            console.log('Device reconnected successfully');
            setIsDeviceReady(true);
            showToastMessage("Device reconnected successfully!");
            return true;
          }
        }
        
        console.log('Device transfer failed - device may be expired');
        throw new Error('Device transfer failed');
        
      } catch (transferError: any) {
        console.error('Transfer failed:', transferError);
        
        // If transfer fails, the device is likely expired
        console.log('Device appears to be expired, need to reinitialize');
        setIsDeviceReady(false);
        showToastMessage("Device expired. Please return to Dashboard to reconnect Spotify.");
        return false;
      }
      
    } catch (error) {
      console.error('Failed to reconnect device:', error);
      setIsDeviceReady(false);
      showToastMessage("Device connection failed. Please return to Dashboard to reconnect.");
      return false;
    } finally {
      setIsReconnecting(false);
    }
  }, [deviceId, isPremium, showToastMessage, validateDeviceAndPlayer]);



  // 4. Finally handlePlayTrack (ONLY ONCE)
  const handlePlayTrack = useCallback(async (track: Track) => {
    console.log('=== TRACK PLAYBACK STARTED ===');
    console.log('Track:', track.name);
    console.log('Track ID:', track.id);
    console.log('Has Preview:', !!track.preview_url);
    console.log('Preview URL:', track.preview_url);
    console.log('Is Premium:', isPremium);
    console.log('Device ID:', deviceId);
    console.log('Device Ready:', isDeviceReady);
    console.log('================================');
    
    // For Premium users with device ready, use Spotify SDK/Web API
    if (isPremium && deviceId && isDeviceReady) {
      console.log('🎵 Using Premium playback via Spotify SDK...');
      
      try {
        // Check if device is still connected before attempting playback
        const deviceCheck = await validateDeviceAndPlayer();
        if (!deviceCheck) {
          console.log('Device validation failed, attempting reconnect...');
          const reconnected = await checkAndReconnectDevice();
          if (!reconnected) {
            console.log('Reconnection failed, falling back to preview');
            fallbackToPreview(track);
            return;
          }
        }
        
        // Use Spotify Web API to play the track
        await playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
        
        setCurrentlyPlayingTrack(track.id);
        setIsPlaying(true);
        console.log('✅ SUCCESS: Premium playback started');
        showToastMessage(`Now playing: ${track.name}`);
        
      } catch (error: any) {
        console.error('❌ Premium playback failed:', error);
        
        // Check if it's a device not found error
        if (error.message && (
          error.message.includes('device_not_found') || 
          error.message.includes('404') ||
          error.message.includes('Device not found') ||
          error.message.includes('device not found')
        )) {
          console.log('🔄 Device not found, attempting reconnection...');
          setIsDeviceReady(false);
          
          const reconnected = await checkAndReconnectDevice();
          if (reconnected) {
            console.log('✅ Device reconnected, retrying playback...');
            try {
              await playTrackOnDevice(`spotify:track:${track.id}`, deviceId);
              setCurrentlyPlayingTrack(track.id);
              setIsPlaying(true);
              console.log('✅ SUCCESS: Premium playback started after reconnection');
              showToastMessage(`Now playing: ${track.name}`);
              return;
            } catch (retryError) {
              console.error('❌ Retry failed after reconnection:', retryError);
            }
          }
        }
        
        handlePlaybackError(error);
        
        // Fall back to preview if available
        if (track.preview_url) {
          console.log('🔄 Falling back to preview mode...');
          fallbackToPreview(track);
        } else {
          showToastMessage("Unable to play track. Device may be expired - please return to Dashboard to reconnect.");
        }
      }
    } else {
      // Fall back to preview for non-Premium users or when device isn't ready
      console.log('🎵 Using preview mode (non-Premium or device not ready)...');
      
      if (!track.preview_url) {
        console.log('❌ No preview URL available');
        showToastMessage("No preview available for this track. Premium account with active device required for full playback.");
        return;
      }
      
      fallbackToPreview(track);
    }
  }, [isPremium, deviceId, isDeviceReady, validateDeviceAndPlayer, checkAndReconnectDevice, fallbackToPreview, showToastMessage, handlePlaybackError]);

  // 5. findNextTrackWithPreview function
  const findNextTrackWithPreview = useCallback((tracks: Array<{ track: Track }>, startIndex: number): number => {
    for (let i = startIndex; i < tracks.length; i++) {
      if (tracks[i].track.preview_url) {
        return i;
      }
    }
    return -1;
  }, []);

  // 6. playEntirePlaylist function
  const playEntirePlaylist = useCallback(async (startIndex = 0) => {
    if (!playlist?.tracks?.items || playlist.tracks.items.length === 0) return;
    
    const tracks = isShuffled ? shuffledTracks : playlist.tracks.items;
    
    if (startIndex < 0 || startIndex >= tracks.length) {
      startIndex = 0;
    }
    
    const trackToPlay = tracks[startIndex].track;
    
    // For Premium users with device ready, use Spotify SDK/Web API
    if (isPremium && deviceId && isDeviceReady) {
      console.log('🎵 Using Premium playback for entire playlist...');
      
      try {
        // Check if device is still connected before attempting playback
        const deviceCheck = await validateDeviceAndPlayer();
        if (!deviceCheck) {
          console.log('Device validation failed, attempting reconnect...');
          const reconnected = await checkAndReconnectDevice();
          if (!reconnected) {
            console.log('Reconnection failed, falling back to preview');
            fallbackToPreview(trackToPlay);
            return;
          }
        }
        
        // Use Spotify Web API to play the track
        await playTrackOnDevice(`spotify:track:${trackToPlay.id}`, deviceId);
        
        setCurrentlyPlayingTrack(trackToPlay.id);
        setIsPlaying(true);
        console.log('✅ SUCCESS: Premium playlist playback started');
        showToastMessage(`Now playing: ${trackToPlay.name}`);
        
      } catch (error: any) {
        console.error('❌ Premium playlist playback failed:', error);
        
        // Check if it's a device not found error
        if (error.message && (
          error.message.includes('device_not_found') || 
          error.message.includes('404') ||
          error.message.includes('Device not found') ||
          error.message.includes('device not found')
        )) {
          console.log('🔄 Device not found, attempting reconnection...');
          setIsDeviceReady(false);
          
          const reconnected = await checkAndReconnectDevice();
          if (reconnected) {
            console.log('✅ Device reconnected, retrying playlist playback...');
            try {
              await playTrackOnDevice(`spotify:track:${trackToPlay.id}`, deviceId);
              setCurrentlyPlayingTrack(trackToPlay.id);
              setIsPlaying(true);
              console.log('✅ SUCCESS: Premium playlist playback started after reconnection');
              showToastMessage(`Now playing: ${trackToPlay.name}`);
              return;
            } catch (retryError) {
              console.error('❌ Retry failed after reconnection:', retryError);
            }
          }
        }
        
        handlePlaybackError(error);
        
        // Fall back to preview if available
        if (trackToPlay.preview_url) {
          console.log('🔄 Falling back to preview mode...');
          fallbackToPreview(trackToPlay);
        } else {
          showToastMessage("Unable to play track. Device may be expired - please return to Dashboard to reconnect.");
        }
      }
    } else {
      // Fall back to preview for non-Premium users or when device isn't ready
      console.log('🎵 Using preview mode for playlist...');
      
      if (audioRef.current) {
        if (currentlyPlayingTrack !== trackToPlay.id || !isPlaying) {
          if (!trackToPlay.preview_url) {
            let nextAvailableIndex = findNextTrackWithPreview(tracks, startIndex);
            if (nextAvailableIndex !== -1) {
              playEntirePlaylist(nextAvailableIndex);
            } else {
              showToastMessage("No playable tracks found in this playlist. Full playback requires Spotify Premium.");
            }
            return;
          }
          
          audioRef.current.src = trackToPlay.preview_url || '';
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setCurrentlyPlayingTrack(trackToPlay.id);
            })
            .catch(err => {
              console.error("Error playing track:", err);
              showToastMessage("Failed to play track preview. This may be due to browser autoplay restrictions.");
            });
        } else if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error("Error resuming playback:", err));
        }
      }
    }
  }, [playlist, shuffledTracks, isShuffled, currentlyPlayingTrack, isPlaying, findNextTrackWithPreview, showToastMessage, isPremium, deviceId, isDeviceReady, validateDeviceAndPlayer, checkAndReconnectDevice, fallbackToPreview, handlePlaybackError]);

  // 7. handleMainPlayButtonClick function
  const handleMainPlayButtonClick = useCallback(() => {
    if (!playlist) return;
    
    // Use proper Premium/preview logic
    if (!currentlyPlayingTrack && playlist?.tracks?.items && playlist.tracks.items.length > 0) {
      playEntirePlaylist(0);
    } else {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error("Error resuming playback:", err));
      }
    }
  }, [currentlyPlayingTrack, isPlaying, playlist, playEntirePlaylist]);

  // 8. Other callback functions
  const handleTrackEnded = useCallback(() => {
    const tracks = isShuffled ? shuffledTracks : playlist?.tracks?.items;
    if (!tracks) return;

    const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
    
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      playEntirePlaylist(currentIndex + 1);
    } else {
      setIsPlaying(false);
      setCurrentlyPlayingTrack(null);
    }
  }, [currentlyPlayingTrack, isShuffled, playlist?.tracks?.items, shuffledTracks, playEntirePlaylist]);

  const handleTrackTap = useCallback((track: Track, event: React.TouchEvent) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;

    if (tapLength < 300 && tapLength > 0) {
      handlePlayTrack(track);
      event.preventDefault();
    }

    setLastTapTime(currentTime);
  }, [lastTapTime, handlePlayTrack]);

  const handleAudioError = useCallback((e: Event) => {
    console.error("Audio playback error:", e);
    setIsPlaying(false);
    showToastMessage("Error playing track. The preview may not be available.");
  }, [showToastMessage]);

  // Add this function to reinitialize Spotify connection
  const reinitializeSpotify = useCallback(async () => {
    console.log('Redirecting to Dashboard to reinitialize Spotify...');
    showToastMessage("Redirecting to Dashboard to reconnect Spotify...");
    
    // Clear expired device info
    localStorage.removeItem('spotify_device_id');
    localStorage.removeItem('spotify_is_premium');
    
    // Navigate back to dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  }, [navigate, showToastMessage]);

  // Update your manual reconnect function
  const manualReconnect = useCallback(async () => {
    if (!isPremium || !deviceId) {
      showToastMessage("Premium account and device ID required for reconnection.");
      return;
    }
    
    showToastMessage("Checking device connection...");
    const success = await checkAndReconnectDevice();
    
    if (!success) {
      // If reconnection fails, offer to reinitialize
      showToastMessage("Device appears to be expired. Click 'Reconnect Spotify' to reinitialize.");
    }
  }, [isPremium, deviceId, checkAndReconnectDevice, showToastMessage]);

  // useEffects
  useEffect(() => {
    const loadPlaylistDetails = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const accessToken = localStorage.getItem('accessToken');

        if (!accessToken) {
          console.error('No access token found');
          navigate('/login');
          return;
        }

        const playlistData = await fetchPlaylistDetails(id);
        console.log('Playlist details loaded:', playlistData);
        
        // Debug: Check preview URLs
        const tracksWithPreviews = playlistData.tracks.items.filter((item: any) => item.track.preview_url);
        console.log('🎵 Tracks with previews:', tracksWithPreviews.length, 'out of', playlistData.tracks.items.length);
        
        // Log first few tracks for debugging
        playlistData.tracks.items.slice(0, 5).forEach((item: any, index: number) => {
          console.log(`Track ${index + 1}:`, {
            name: item.track.name,
            id: item.track.id,
            preview_url: item.track.preview_url,
            hasPreview: !!item.track.preview_url
          });
        });
        
        setPlaylist(playlistData);
      } catch (err) {
        console.error('Error fetching playlist details:', err);
        setError('Failed to load playlist. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadPlaylistDetails();
  }, [id, navigate]);

  useEffect(() => {
    const existingDeviceId = localStorage.getItem('spotify_device_id');
    const isPremiumUser = localStorage.getItem('spotify_is_premium') === 'true';
    
    if (existingDeviceId) {
      setDeviceId(existingDeviceId);
      setIsPremium(isPremiumUser);
      // Don't assume device is ready - validate it first
      setIsDeviceReady(false);
    }
  }, []);

  // Add this useEffect for audio event listeners
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.addEventListener('ended', handleTrackEnded);
      audio.addEventListener('error', handleAudioError);

      return () => {
        audio.removeEventListener('ended', handleTrackEnded);
        audio.removeEventListener('error', handleAudioError);
      };
    }
  }, [handleTrackEnded, handleAudioError]);

  // Add this useEffect after your existing ones
  useEffect(() => {
    if (isPremium && deviceId) {
      // Check device connection when component mounts
      console.log('Checking device on component mount...');
      checkAndReconnectDevice();
    }
  }, [isPremium, deviceId, checkAndReconnectDevice]);

  // Also add periodic device health check
  useEffect(() => {
    if (!isPremium || !deviceId) return;
    
    const healthCheck = setInterval(async () => {
      if (isDeviceReady && !isReconnecting) {
        try {
          const deviceHealth = await checkDeviceHealth(deviceId);
          
          if (!deviceHealth.exists) {
            console.log('Device health check failed - device not found in devices list');
            setIsDeviceReady(false);
            showToastMessage("Device disconnected. Click reconnect to restore playback.");
          } else if (!deviceHealth.isActive) {
            console.log(`Device found but not active: ${deviceHealth.name} (${deviceHealth.type})`);
            // Device exists but may not be active - this is often recoverable
          } else {
            console.log(`Device healthy: ${deviceHealth.name} (${deviceHealth.type}) - Active: ${deviceHealth.isActive}`);
          }
        } catch (error) {
          console.error('Device health check error:', error);
          // Don't set device as not ready for network errors unless it's a clear device not found
          if (error instanceof Error && error.message.includes('device_not_found')) {
            setIsDeviceReady(false);
          }
        }
      }
    }, 45000); // Check every 45 seconds (less frequent to avoid rate limiting)
    
    return () => clearInterval(healthCheck);
  }, [isPremium, deviceId, isDeviceReady, isReconnecting, showToastMessage]);

  // Utility functions
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const handleBackClick = () => {
    navigate('/dashboard');
  };

  const handleSmartShuffle = () => {
    if (!playlist) return;

    if (isShuffled) {
      setIsShuffled(false);
      return;
    }

    const tracksToShuffle = [...playlist.tracks.items];

    for (let i = tracksToShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracksToShuffle[i], tracksToShuffle[j]] = [tracksToShuffle[j], tracksToShuffle[i]];
    }

    setShuffledTracks(tracksToShuffle);
    setIsShuffled(true);
  };

  // Rest of your component JSX...
  if (loading) return <div className="loading">Loading playlist...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!playlist) return <div className="error">Playlist not found</div>;

  return (
    <div className="playlist-detail">
      <audio ref={audioRef} />
      
      {/* Toast notification */}
      {showToast && (
        <div className="toast-notification">
          <div className="toast-content">
            <span>{toastMessage}</span>
            <button onClick={() => setShowToast(false)}>×</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="playlist-header">
        <button onClick={handleBackClick} className="back-button">
          ← Back to Dashboard
        </button>
        
        {/* Device Status */}
        {isPremium && (
          <div className={`device-status ${isDeviceReady ? 'connected' : 'disconnected'}`}>
            {isReconnecting ? (
              <>
                <div className="spinner"></div>
                <span>Reconnecting...</span>
              </>
            ) : isDeviceReady ? (
              <>
                <div className="status-dot connected"></div>
                <span>Device Ready</span>
              </>
            ) : (
              <>
                <div className="status-dot disconnected"></div>
                <span>Device Offline</span>
                <div className="device-actions">
                  <button onClick={manualReconnect} className="reconnect-btn">
                    Retry
                  </button>
                  <button onClick={reinitializeSpotify} className="reinit-btn">
                    Reconnect Spotify
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Playlist Info */}
      <div className="playlist-info">
        <div className="playlist-image">
          <ImageWithFallback
            src={playlist.images?.[0]?.url || ''}
            alt={playlist.name}
            fallbackSrc="https://via.placeholder.com/300x300/6c2dc7/ffffff?text=No+Image"
          />
        </div>
        
        <div className="playlist-details">
          <h1>{playlist.name}</h1>
          <p className="playlist-description">{playlist.description}</p>
          <div className="playlist-meta">
            <span>By {playlist.owner.display_name}</span>
            <span>•</span>
            <span>{playlist.tracks.total} tracks</span>
            {playlist.followers && (
              <>
                <span>•</span>
                <span>{playlist.followers.total} followers</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="playlist-controls">
        <button 
          onClick={handleMainPlayButtonClick}
          className="main-play-button"
        >
          {isPlaying ? '⏸️' : '▶️'} {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <button 
          onClick={handleSmartShuffle}
          className={`shuffle-button ${isShuffled ? 'active' : ''}`}
        >
          🔀 {isShuffled ? 'Unshuffle' : 'Shuffle'}
        </button>
      </div>

      {/* Track List */}
      <div className="track-list">
        <div className="track-list-header">
          <span className="track-number">#</span>
          <span className="track-title">Title</span>
          <span className="track-duration">Duration</span>
        </div>
        
        {(isShuffled ? shuffledTracks : playlist.tracks.items).map((item: any, index: number) => (
          <div
            key={`${item.track.id}-${index}`}
            className={`track-item ${currentlyPlayingTrack === item.track.id ? 'playing' : ''}`}
            onClick={() => handlePlayTrack(item.track)}
            onTouchStart={(e) => handleTrackTap(item.track, e)}
          >
            <div className="track-number">
              {currentlyPlayingTrack === item.track.id && isPlaying ? (
                <div className="now-playing-indicator">
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                </div>
              ) : (
                index + 1
              )}
            </div>
            
            <div className="track-info">
              <div className="track-name">
                {item.track.name}
                {!item.track.preview_url && (
                  <span className="no-preview-badge" title="No preview available">🔒</span>
                )}
              </div>
              <div className="track-artist">
                {item.track.artists.map((artist: any) => artist.name).join(', ')}
              </div>
            </div>
            
            <div className="track-duration">
              {formatDuration(item.track.duration_ms)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistDetail;