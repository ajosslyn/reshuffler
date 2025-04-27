import React from 'react';
import './PlaylistCard.css';

interface PlaylistCardProps {
  playlist: {
    id: string;
    name: string;
    description?: string;
    images?: Array<{ url: string }>;
    owner?: {
      display_name: string;
    };
  };
  onSelect: () => void;
  onPlay: () => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onSelect, onPlay }) => {
  const coverImage = playlist.images && playlist.images.length > 0
    ? playlist.images[0].url
    : 'https://via.placeholder.com/300?text=No+Cover';

  return (
    <div className="playlist-card" onClick={onSelect}>
      <div className="playlist-card-cover">
        <img src={coverImage} alt={playlist.name} />
        <div 
          className="play-button"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <polygon points="8,5 19,12 8,19" fill="white" />
          </svg>
        </div>
      </div>
      <div className="playlist-card-info">
        <h3 className="playlist-card-title">{playlist.name}</h3>
        {playlist.description && (
          <p className="playlist-card-description">{playlist.description}</p>
        )}
        {playlist.owner && (
          <p className="playlist-card-owner">By {playlist.owner.display_name}</p>
        )}
      </div>
    </div>
  );
};

export default PlaylistCard;