import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  fetchPlaylistDetails, 
  fetchPlaylistTracks,
  playTrackOnDevice,
  transferPlaybackToDevice,
  playPlaylistOnDevice
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
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isDeviceReady, setIsDeviceReady] = useState<boolean>(false);

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
    // Check for existing SDK instance from Dashboard
    const existingDeviceId = localStorage.getItem('spotify_device_id');
    const isPremiumUser = localStorage.getItem('spotify_is_premium') === 'true';
    
    if (existingDeviceId) {
      setDeviceId(existingDeviceId);
      setIsPremium(isPremiumUser);
      setIsDeviceReady(true);
    }
  }, []);

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

  // First, add a function declaration for handlePlayTrack with useCallback
  const handlePlayTrack = useCallback((track: Track) => {
    if (isPremium && deviceId && isDeviceReady) {
      playTrackOnDevice(`spotify:track:${track.id}`, deviceId)
        .then(() => {
          setIsPlaying(true);
          setCurrentlyPlayingTrack(track.id);
        })
        .catch(handlePlaybackError);
    } else {
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
  }, [audioRef, currentlyPlayingTrack, isPlaying, isPremium, deviceId, isDeviceReady, handlePlaybackError]);

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

  const playEntirePlaylist = useCallback((startIndex = 0) => {
    if (!playlist?.tracks?.items || playlist.tracks.items.length === 0) return;
    
    const tracks = isShuffled ? shuffledTracks : playlist.tracks.items;
    
    // Make sure we have a valid start index
    if (startIndex < 0 || startIndex >= tracks.length) {
      startIndex = 0;
    }
    
    // Start playing from the selected track
    const trackToPlay = tracks[startIndex].track;
    
    if (audioRef.current) {
      // Only set the URL if it's a different track or not currently playing
      if (currentlyPlayingTrack !== trackToPlay.id || !isPlaying) {
        if (!trackToPlay.preview_url) {
          // If no preview URL, try to find the next available track
          let nextAvailableIndex = findNextTrackWithPreview(tracks, startIndex);
          if (nextAvailableIndex !== -1) {
            playEntirePlaylist(nextAvailableIndex);
          } else {
            alert("No playable tracks found in this playlist. Full playback requires Spotify Premium.");
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
            alert("Failed to play track preview. This may be due to browser autoplay restrictions.");
          });
      } else if (isPlaying) {
        // If it's the same track and already playing, just pause
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        // If it's the same track but paused, resume playing
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error("Error resuming playback:", err));
      }
    }
  }, [playlist, shuffledTracks, isShuffled, currentlyPlayingTrack, isPlaying]);

  // Update the findNextTrackWithPreview function with proper typing
  const findNextTrackWithPreview = useCallback((tracks: Array<{ track: Track }>, startIndex: number): number => {
    for (let i = startIndex; i < tracks.length; i++) {
      if (tracks[i].track.preview_url) {
        return i;
      }
    }
    return -1;
  }, []);

  // Update handleTrackEnded to use the playEntirePlaylist function
  const handleTrackEnded = useCallback(() => {
    const tracks = isShuffled ? shuffledTracks : playlist?.tracks?.items;
    if (!tracks) return;

    const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
    
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      // Play the next track in the playlist
      playEntirePlaylist(currentIndex + 1);
    } else {
      // End of playlist reached
      setIsPlaying(false);
      setCurrentlyPlayingTrack(null);
    }
  }, [currentlyPlayingTrack, isShuffled, playlist?.tracks?.items, shuffledTracks, playEntirePlaylist, isPremium, deviceId]);

  const handleAudioError = useCallback((e: Event) => {
    console.error("Audio playback error:", e);
    setIsPlaying(false);
    alert("Error playing track. The preview may not be available.");
  }, []);

  // Add this function before your handlePlayTrack function
 

  // Replace your existing handleMainPlayButtonClick with this implementation
  const handleMainPlayButtonClick = useCallback(() => {
    if (!playlist) return;
    
    if (isPremium && deviceId && isDeviceReady && id) {
      // Play the entire playlist using SDK
      console.log('Using SDK to play entire playlist');
      
      playPlaylistOnDevice(`spotify:playlist:${id}`, deviceId, 0)
        .then(() => {
          setIsPlaying(true);
          if (playlist.tracks.items.length > 0) {
            setCurrentlyPlayingTrack(playlist.tracks.items[0].track.id);
          }
        })
        .catch(err => {
          handlePlaybackError(err);
          
          // Fall back to playing first track with preview URL
          if (playlist.tracks.items.length > 0 && playlist.tracks.items[0].track.preview_url) {
            playEntirePlaylist(0);
          } else {
            alert("No preview available for the first track.");
          }
        });
    } else {
      if (!currentlyPlayingTrack && playlist?.tracks?.items && playlist.tracks.items.length > 0) {
        // Start playing from the first track
        playEntirePlaylist(0);
      } else {
        // Toggle play/pause for the current track
        if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(false);
        } else {
          audioRef.current?.play()
            .then(() => setIsPlaying(true))
            .catch(err => console.error("Error resuming playback:", err));
        }
      }
    }
  }, [currentlyPlayingTrack, isPlaying, playlist, id, isPremium, deviceId, isDeviceReady, playEntirePlaylist, handlePlaybackError]);

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
  }, [handleTrackEnded, handleAudioError]); // Add both functions to dependency array

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="playlist-detail-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="playlist-detail-container">
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button className="btn" onClick={handleBackClick}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="playlist-detail-container">
        <div className="error-container">
          <h2>Playlist not found</h2>
          <button className="btn" onClick={handleBackClick}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const coverImage = playlist.images && playlist.images.length > 0
    ? playlist.images[0].url
    : 'https://via.placeholder.com/300?text=No+Cover';

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
          <img src={coverImage} alt={playlist.name} />
        </div>
        <div className="playlist-info">
          <h1 className="playlist-title">{playlist.name}</h1>
          {playlist.description && (
            <p className="playlist-description">{playlist.description}</p>
          )}
          <div className="playlist-meta">
            <span>{playlist.owner.display_name}</span>
            {playlist.followers && (
              <span> • {playlist.followers.total.toLocaleString()} likes</span>
            )}
            <span> • {playlist.tracks.total} songs</span>
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

        <div className="playlist-action-buttons">
          <button className={`shuffle-button ${isShuffled ? 'active' : ''}`} onClick={handleSmartShuffle}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17L10.59 9.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>

          <button className="more-button">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <circle cx="12" cy="4" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="20" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>

        {isPremium && (
  <div className="premium-badge">
    <svg viewBox="0 0 16 16" width="16" height="16">
      <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922z" />
    </svg>
    <span>Premium</span>
  </div>
)}

      </div>

      <div className="tracks-container">
        <div className="tracks-header">
          <div className="track-number">#</div>
          <div className="track-title">TITLE</div>
          <div className="track-album">ALBUM</div>
          <div className="track-duration">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zM8 14A6 6 0 118 2a6 6 0 010 12zM8 3.5a.5.5 0 01.5.5v4.096l3.813 2.292a.5.5 0 01-.526.851l-4-2.5a.5.5 0 01-.287-.454V4a.5.5 0 01.5-.5z" />
            </svg>
          </div>
        </div>

        <div className="tracks-list">
          {(isShuffled ? shuffledTracks : playlist.tracks.items).map((item, index) => (
            <div
              key={`${item.track.id}-${index}`}
              className={`track-item ${currentlyPlayingTrack === item.track.id ? 'playing' : ''}`}
              onClick={() => handlePlayTrack(item.track)}
              onTouchStart={(e) => handleTrackTap(item.track, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handlePlayTrack(item.track);
                  e.preventDefault();
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={currentlyPlayingTrack === item.track.id}
              aria-label={`Play ${item.track.name} by ${item.track.artists.map((a: { name: string }) => a.name).join(', ')}`}
            >
              <div className="track-number">
                {currentlyPlayingTrack === item.track.id && isPlaying ? (
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
                {currentlyPlayingTrack === item.track.id && isPlaying ? (
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                    <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <polygon points="8,5 19,12 8,19" fill="currentColor" />
                  </svg>
                )}
              </div>
              <div className="track-title-container">
                <div className="track-artwork">
                  <img
                    src={item.track.album.images && item.track.album.images.length > 0
                      ? item.track.album.images[item.track.album.images.length - 1].url
                      : 'https://via.placeholder.com/40'}
                    alt={item.track.album.name}
                  />
                </div>
                <div className="track-info">
                  <div className="track-name">{item.track.name}</div>
                  <div className="track-artist">
                    {item.track.artists.map((artist: { name: string }) => artist.name).join(', ')}
                  </div>
                </div>
              </div>
              <div className="track-album">{item.track.album.name}</div>
              <div className="track-duration">{formatDuration(item.track.duration_ms)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlaylistDetail;