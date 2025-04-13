import React, { useEffect, useState } from 'react';
import { fetchPlaylists } from '../api/spotify';
import PlaylistCard from './Playlist/PlaylistCard';
import SmartGrouping from './Playlist/SmartGrouping';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadPlaylists = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                const tokenExpiration = localStorage.getItem('tokenExpiration');
                const isExpired = tokenExpiration && parseInt(tokenExpiration) < Date.now();
                const permissionsIssue = localStorage.getItem('permissionErrors') && 
                                        parseInt(localStorage.getItem('permissionErrors') || '0') > 2;

                if (!accessToken || isExpired || permissionsIssue) {
                    console.error('Token invalid, expired, or permissions issue');
                    // Clear problematic storage
                    if (permissionsIssue) {
                        localStorage.removeItem('permissionErrors');
                        localStorage.removeItem('accessToken');
                    }
                    setLoading(false);
                    navigate('/login' + (permissionsIssue ? '?reason=permissions' : ''));
                    return;
                }

                const data = await fetchPlaylists(accessToken);
                setPlaylists(data);
            } catch (error) {
                console.error('Error fetching playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPlaylists();
    }, [navigate]);

    const handlePlaylistSelect = (playlist: any) => {
        console.log("Selected playlist:", playlist.id);
        setSelectedPlaylist(playlist);
        navigate(`/playlist/${playlist.id}`);
    };

    const handleLogout = () => {
        localStorage.clear(); // Clear all storage, not just the token
        navigate('/login?reason=permissions'); // Add a reason parameter
    };

    if (loading) {
        return <div className="loading-spinner"></div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1 className="dashboard-title">Your Playlists</h1>
                <div className="user-info">
                    <div className="user-avatar">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path fill="white" d="M8 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                    <span className="user-name">Spotify User</span>
                    <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
            </div>
            
            <SmartGrouping />
            
            <h2 className="section-title">All Playlists</h2>
            <div className="playlist-grid">
                {playlists && playlists.length > 0 ? (
                    playlists.map((playlist) => (
                        <PlaylistCard
                            key={playlist.id}
                            playlist={playlist}
                            onSelect={() => handlePlaylistSelect(playlist)}
                        />
                    ))
                ) : (
                    <p>No playlists found</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;