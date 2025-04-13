import React from 'react';
import './Login.css'; // We'll create this CSS file

const Login: React.FC = () => {
  const handleLogin = () => {
    // Define all required scopes
    const scopes = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private', 
        'playlist-read-collaborative',
        'user-top-read',          // Add this for audio features
        'user-read-recently-played' // Optional but useful
    ];
    
    // Create the authorization URL with all required scopes
    const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID || ''; 
    const REDIRECT_URI = window.location.origin + '/callback';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(scopes.join(' '))}`;
    
    // Redirect to Spotify authorization
    window.location.href = authUrl;
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="logo-container">
          <svg className="spotify-icon" viewBox="0 0 24 24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
          <h1 className="app-title">Music Shuffler</h1>
        </div>
        
        <div className="login-content">
          <h2 className="login-heading">Shuffle your tunes.</h2>
          <p className="login-description">
            Connect with your Spotify account to create smarter, 
            more organized playlists based on your listening habits.
          </p>
          
          <div className="login-divider">
            <hr /><span>Login</span><hr />
          </div>
          
          <button onClick={handleLogin} className="login-button">
            <svg className="spotify-small-icon" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>CONTINUE WITH SPOTIFY</span>
          </button>
          
          <p className="terms-text">
            By continuing, you agree to Spotify's Terms of Service and
            Privacy Policy.
          </p>
        </div>
      </div>
      <footer className="login-footer">
        <p>© 2025 Music Shuffler. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;