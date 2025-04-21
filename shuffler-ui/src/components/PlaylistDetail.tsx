import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPlaylistDetails } from '../api/spotify';
import './PlaylistDetail.css';

// Properly extend the Window interface for TypeScript
declare global {
  interface Window {
    Spotify?: {
      Player?: any;
    }
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

        const playlistData = await fetchPlaylistDetails(accessToken, id);
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
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const handlePlayTrack = (track: Track) => {
    if (window.Spotify && window.Spotify.Player) {
      console.log("Using Spotify Web Playback SDK to play track:", track.id);
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
  };

  const handleMainPlayButtonClick = () => {
    if (!currentlyPlayingTrack && playlist?.tracks?.items && playlist.tracks.items.length > 0) {
      const tracks = isShuffled ? shuffledTracks : playlist.tracks.items;
      // Extra safety check before accessing index
      if (tracks && tracks.length > 0 && tracks[0].track) {
        handlePlayTrack(tracks[0].track);
      }
    } else {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTrackEnded = () => {
    const tracks = isShuffled ? shuffledTracks : playlist?.tracks?.items;
    // Add a null check for tracks
    if (!tracks) return;
    
    const currentIndex = tracks.findIndex(item => item.track.id === currentlyPlayingTrack);
    
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      const nextTrack = tracks[currentIndex + 1].track;
      handlePlayTrack(nextTrack);
    } else {
      setIsPlaying(false);
      setCurrentlyPlayingTrack(null);
    }
  };

  const handleAudioError = (e: Event) => {
    console.error("Audio playback error:", e);
    setIsPlaying(false);
    alert("Error playing track. The preview may not be available.");
  };

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
      <button className="back-button" onClick={handleBackClick}>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
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
          className={`play-button ${isPlaying ? 'playing' : ''}`} 
          onClick={handleMainPlayButtonClick}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <rect x="6" y="4" width="4" height="16" fill="currentColor" />
              <rect x="14" y="4" width="4" height="16" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <polygon points="8,5 19,12 8,19" fill="currentColor" />
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