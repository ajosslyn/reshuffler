import React, { useEffect, useState } from 'react';
import { fetchPlaylists, fetchUserProfile } from '../api/spotify';
import PlaylistCard from './Playlist/PlaylistCard';
import SmartGrouping from './Playlist/SmartGrouping';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [userName, setUserName] = useState<string>('Spotify User');
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [greeting, setGreeting] = useState<string>('Good morning');
    const navigate = useNavigate();

    useEffect(() => {
        // Set greeting based on time of day
        const hours = new Date().getHours();
        if (hours >= 5 && hours < 12) {
            setGreeting('Good morning');
        } else if (hours >= 12 && hours < 18) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }

        const loadData = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                const tokenExpiration = localStorage.getItem('tokenExpiration');
                const isExpired = tokenExpiration && parseInt(tokenExpiration) < Date.now();

                if (!accessToken || isExpired) {
                    console.error('No access token found or token expired');
                    setLoading(false);
                    navigate('/login');
                    return;
                }

                const data = await fetchPlaylists(accessToken);
                setPlaylists(data);

                try {
                    const userProfile = await fetchUserProfile(accessToken);
                    setUserName(userProfile.display_name || 'Spotify User');
                    // Get user avatar if available
                    if (userProfile.images && userProfile.images.length > 0) {
                        setUserAvatar(userProfile.images[0].url);
                    }
                } catch (profileError) {
                    console.error('Error fetching user profile:', profileError);
                }
            } catch (error) {
                console.error('Error fetching playlists:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handlePlaylistSelect = (playlist: any) => {
        console.log("Selected playlist:", playlist.id);
        setSelectedPlaylist(playlist);
        navigate(`/playlist/${playlist.id}`);
    };

    const handleLogout = () => {
        // Clear all auth-related data from localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenExpiration');
        localStorage.removeItem('refreshToken');
        
        // Clear any application state
        setPlaylists([]);
        setUserName('Spotify User');
        setUserAvatar(null);
        
        // Navigate to login page
        navigate('/login');
        
        // Optional: Display a success message
        console.log('Successfully logged out');
    };

    if (loading) {
        return <div className="spotify-loading-container">
            <div className="spotify-loading-spinner"></div>
        </div>;
    }

    // Get recommended playlists for top section (first 6)
    const topPlaylists = playlists.slice(0, 6);

    // Use a copy of all playlists for Your Playlists section
    const allPlaylists = [...playlists];

    return (
        <div className="spotify-layout">
            {/* Left Sidebar */}
            <div className="spotify-sidebar">
                <div className="sidebar-logo">
                    <svg viewBox="0 0 1134 340" className="spotify-logo">
                        <path fill="white" d="M8 171.4c0 92.6 76.9 167.8 174 167.8 100.4 0 174.6-75.4 174.6-167.8S282.6 4.3 182 4.3C85 4.3 8 78.7 8 171.4zm230.7-58.7c-16.8-16.4-43.9-20.3-70.4-11.1-26.5 9.1-46.8 29.9-55.3 57.2-8.5 27.1-.7 52 20.2 68.5 16.8 16.4 43.9 20.3 70.4 11.1 26.5-9.1 46.8-29.9 55.3-57.2 8.5-27.2.8-52.1-20.2-68.5z"/>
                        <path fill="white" d="M135.3 259.3c-42.6 0-77.2-34.3-77.2-76.7 0-42.4 34.5-76.7 77.2-76.7 42.6 0 77.2 34.3 77.2 76.7 0 42.4-34.6 76.7-77.2 76.7zm0-141.9c-36.3 0-65.8 29.2-65.8 65.2 0 36 29.5 65.2 65.8 65.2 36.3 0 65.8-29.2 65.8-65.2 0-36-29.5-65.2-65.8-65.2z"/>
                        <path fill="white" d="M139.3 203.5c-3.1 5.8-9.4 9.5-16.2 9.5-10.3 0-18.7-8.2-18.7-18.4 0-10.2 8.4-18.4 18.7-18.4 6.8 0 13.1 3.7 16.2 9.5 3.3 6.3 10.3 9.7 17.2 8.5 7-1.3 12.2-7.3 12.2-14.5 0-29.2-23.9-52.9-53.3-52.9-29.4 0-53.3 23.8-53.3 52.9 0 29.2 23.9 52.9 53.3 52.9 29.4 0 53.3-23.8 53.3-52.9 0-7.2-5.3-13.2-12.2-14.5-6.9-1.2-13.9 2.2-17.2 8.4z"/>
                    </svg>
                    <span className="spotify-logo-text">Shuffler</span>
                </div>
                
                <nav className="sidebar-nav">
                    <ul>
                        <li className="nav-item active">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M13.5 1.515a3 3 0 00-3 0L3 5.845a2 2 0 00-1 1.732V21a1 1 0 001 1h6a1 1 0 001-1v-6h4v6a1 1 0 001 1h6a1 1 0 001-1V7.577a2 2 0 00-1-1.732l-7.5-4.33z"/>
                            </svg>
                            <span>Home</span>
                        </li>
                        <li className="nav-item">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 101.414-1.414l-4.344-4.344a9.157 9.157 0 002.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.28 7.407-7.28s7.407 3.274 7.407 7.28-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.28z"/>
                            </svg>
                            <span>Search</span>
                        </li>
                        <li className="nav-item">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M14.5 2.134a1 1 0 011 0l6 3.464a1 1 0 01.5.866V21a1 1 0 01-1 1h-6a1 1 0 01-1-1V3a1 1 0 01.5-.866zM16 4.732V20h4V7.041l-4-2.309zM3 22a1 1 0 01-1-1V3a1 1 0 011-1h6a1 1 0 011 1v18a1 1 0 01-1 1H3zm1-2h4V4H4v16z"/>
                            </svg>
                            <span>Your Library</span>
                        </li>
                    </ul>
                    
                    <div className="sidebar-section">
                        <div className="sidebar-action">
                            <div className="action-icon">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M15.25 8a.75.75 0 01-.75.75H8.75v5.75a.75.75 0 01-1.5 0V8.75H1.5a.75.75 0 010-1.5h5.75V1.5a.75.75 0 011.5 0v5.75h5.75a.75.75 0 01.75.75z"/>
                                </svg>
                            </div>
                            <span>Create Playlist</span>
                        </div>
                        
                        <div className="sidebar-action">
                            <div className="action-icon liked-songs">
                                <svg viewBox="0 0 16 16" width="16" height="16">
                                    <path fill="currentColor" d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"/>
                                </svg>
                            </div>
                            <span>Liked Songs</span>
                        </div>
                    </div>
                    
                    <div className="sidebar-divider"></div>
                    
                    <div className="sidebar-playlists">
                        {playlists.slice(0, 10).map(playlist => (
                            <div 
                                key={playlist.id} 
                                className="sidebar-playlist-item"
                                onClick={() => handlePlaylistSelect(playlist)}
                            >
                                {playlist.name}
                            </div>
                        ))}
                    </div>
                </nav>
            </div>
            
            {/* Main Content */}
            <main className="spotify-main">
                <div className="main-header">
                    <div className="navigation-buttons">
                        <button className="nav-button">
                            <svg viewBox="0 0 24 24" width="22" height="22">
                                <path fill="currentColor" d="M15.957 2.793a1 1 0 010 1.414L8.164 12l7.793 7.793a1 1 0 11-1.414 1.414L5.336 12l9.207-9.207a1 1 0 011.414 0z"/>
                            </svg>
                        </button>
                        <button className="nav-button">
                            <svg viewBox="0 0 24 24" width="22" height="22">
                                <path fill="currentColor" d="M8.043 2.793a1 1 0 000 1.414L15.836 12l-7.793 7.793a1 1 0 101.414 1.414L18.664 12 9.457 2.793a1 1 0 00-1.414 0z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div className="user-controls">
                        <div className="user-dropdown">
                            <div className="user-avatar">
                                {userAvatar ? (
                                    <img src={userAvatar} alt={userName} />
                                ) : (
                                    <svg viewBox="0 0 16 16" width="16" height="16">
                                        <path fill="white" d="M8 8c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                    </svg>
                                )}
                            </div>
                            <span className="user-name">{userName}</span>
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M14 6l-6 6-6-6h12z"/>
                            </svg>
                            
                            {/* Add dropdown menu */}
                            <div className="dropdown-menu">
                                <div className="dropdown-item" onClick={() => navigate('/profile')}>Profile</div>
                                <div className="dropdown-item" onClick={() => navigate('/settings')}>Settings</div>
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item logout" onClick={handleLogout}>
                                    Log out
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="main-content">
                    <h1 className="greeting-title">{greeting}</h1>
                    
                    <div className="top-row-grid">
                        {topPlaylists.map(playlist => (
                            <div 
                                key={playlist.id}
                                className="top-row-item"
                                onClick={() => handlePlaylistSelect(playlist)}
                            >
                                <img 
                                    src={playlist.images && playlist.images.length > 0 ? playlist.images[0].url : 'https://via.placeholder.com/80'} 
                                    alt={playlist.name} 
                                />
                                <span>{playlist.name}</span>
                                <div className="play-icon">
                                    <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path fill="white" d="M8 5.14v14l11-7-11-7z"/>
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <SmartGrouping />
                    
                    <div className="section-header">
                        <h2>Your Playlists</h2>
                        <button className="see-all">SEE ALL</button>
                    </div>
                    
                    <div className="playlist-grid">
                        {allPlaylists.map(playlist => (
                            <PlaylistCard
                                key={playlist.id}
                                playlist={playlist}
                                onSelect={() => handlePlaylistSelect(playlist)}
                            />
                        ))}
                    </div>
                </div>
            </main>
            
            {/* Playback controls footer */}
            <footer className="spotify-footer">
                <div className="now-playing">
                    <div className="track-info">
                        <div className="track-image">
                            <img src="https://via.placeholder.com/56?text=Track" alt="Current track" />
                        </div>
                        <div className="track-details">
                            <div className="track-name">Select a track</div>
                            <div className="track-artist">to start playing</div>
                        </div>
                        <button className="like-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div className="player-controls">
                    <div className="control-buttons">
                        <button className="control-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 00.39 3.5z"/>
                            </svg>
                        </button>
                        <button className="control-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z"/>
                            </svg>
                        </button>
                        <button className="control-button play-pause">
                            <svg viewBox="0 0 16 16" width="32" height="32">
                                <path fill="currentColor" d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"/>
                            </svg>
                        </button>
                        <button className="control-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z"/>
                            </svg>
                        </button>
                        <button className="control-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z"/>
                            </svg>
                        </button>
                    </div>
                    <div className="playback-bar">
                        <span className="playback-time">0:00</span>
                        <div className="progress-bar">
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill"></div>
                            </div>
                        </div>
                        <span className="playback-time">0:00</span>
                    </div>
                </div>
                
                <div className="playback-controls">
                    <button className="control-button">
                        <svg viewBox="0 0 16 16" width="16" height="16">
                            <path fill="currentColor" d="M13.426 2.574a2.831 2.831 0 00-4.797 1.55l3.247 3.247a2.831 2.831 0 001.55-4.797zM10.5 8.118l-2.619-2.62A63303.13 63303.13 0 004.74 9.075L2.065 12.12a1.287 1.287 0 001.816 1.816l3.06-2.688 3.56-3.129zM7.12 4.094a4.331 4.331 0 114.786 4.786l-3.974 3.493-3.06 2.689a2.787 2.787 0 01-3.933-3.933l2.676-3.045 3.505-3.99z"/>
                        </svg>
                    </button>
                    <button className="control-button">
                        <svg viewBox="0 0 16 16" width="16" height="16">
                            <path fill="currentColor" d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 013.5 1h9a2.5 2.5 0 010 5h-9A2.5 2.5 0 011 3.5zm2.5-1a1 1 0 000 2h9a1 1 0 100-2h-9z"/>
                        </svg>
                    </button>
                    <button className="control-button">
                        <svg viewBox="0 0 16 16" width="16" height="16">
                            <path fill="currentColor" d="M6 2.75C6 1.784 6.784 1 7.75 1h6.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0114.25 15h-6.5A1.75 1.75 0 016 13.25V2.75zm1.75-.25a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 00.25-.25V2.75a.25.25 0 00-.25-.25h-6.5zm-6 0a.25.25 0 00-.25.25v6.5c0 .138.112.25.25.25H4V11H1.75A1.75 1.75 0 010 9.25v-6.5C0 1.784.784 1 1.75 1H4v1.5H1.75zM4 15H2v-1.5h2V15z"/>
                        </svg>
                    </button>
                    <div className="volume-container">
                        <button className="control-button">
                            <svg viewBox="0 0 16 16" width="16" height="16">
                                <path fill="currentColor" d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"/>
                            </svg>
                        </button>
                        <div className="volume-bar">
                            <div className="volume-bar-bg">
                                <div className="volume-bar-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;