import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPlaylistDetails } from '../api/spotify';
import './PlaylistDetail.css';

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images?: Array<{ url: string }>;
  };
  duration_ms: number;
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

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  const handleBackClick = () => {
    navigate('/dashboard');
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
        Back to Dashboard
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
            <span>By {playlist.owner.display_name}</span>
            {playlist.followers && (
              <span> • {playlist.followers.total.toLocaleString()} followers</span>
            )}
            <span> • {playlist.tracks.total} tracks</span>
          </div>
          
          <div className="playlist-actions">
            <button className="btn play-button">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <polygon points="8,5 19,12 8,19" fill="currentColor" />
              </svg>
              Play
            </button>
            <button className="btn btn-outline shuffle-button">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17L10.59 9.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
              Smart Shuffle
            </button>
          </div>
        </div>
      </div>
      
      <div className="tracks-container">
        <div className="tracks-header">
          <div className="track-number">#</div>
          <div className="track-title">Title</div>
          <div className="track-album">Album</div>
          <div className="track-duration">
            <svg viewBox="0 0 16 16" width="16" height="16">
              <path fill="currentColor" d="M8 0a8 8 0 100 16A8 8 0 008 0zM8 14A6 6 0 118 2a6 6 0 010 12zM8 3.5a.5.5 0 01.5.5v4.096l3.813 2.292a.5.5 0 01-.526.851l-4-2.5a.5.5 0 01-.287-.454V4a.5.5 0 01.5-.5z" />
            </svg>
          </div>
        </div>
        
        <div className="tracks-list">
          {playlist.tracks.items.map((item, index) => (
            <div key={`${item.track.id}-${index}`} className="track-item">
              <div className="track-number">{index + 1}</div>
              <div className="track-title-container">
                <div className="track-name">{item.track.name}</div>
                <div className="track-artist">
                  {item.track.artists.map(artist => artist.name).join(', ')}
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