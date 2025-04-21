import React from 'react';
import './PlaylistCard.css';

interface PlaylistCardProps {
    playlist: {
        id: string;
        name: string;
        description?: string;
        images?: Array<{ url: string }>;
        tracks: { total: number };
    };
    onSelect: (playlist: { id: string; name: string; description?: string; images?: Array<{ url: string }>; tracks: { total: number } }) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({ playlist, onSelect }) => {
    console.log("Rendering playlist card:", playlist.id);

    const coverImage = playlist.images && playlist.images.length > 0
        ? playlist.images[0].url
        : 'https://via.placeholder.com/150?text=No+Cover';
        
    return (
        <div 
            className="playlist-card" 
            onClick={() => {
                console.log("Playlist clicked:", playlist.id);
                onSelect(playlist);
            }}
        >
            <div className="playlist-cover">
                <img src={coverImage} alt={playlist.name} />
                <div className="play-button">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <polygon points="8,5 19,12 8,19" fill="white" />
                    </svg>
                </div>
            </div>
            <div className="playlist-info">
                <h3 className="playlist-title">{playlist.name}</h3>
                {playlist.description && (
                    <p className="playlist-description">{playlist.description}</p>
                )}
                <div className="playlist-meta">
                    {playlist.tracks.total} tracks
                </div>
            </div>
        </div>
    );
};

export default PlaylistCard;