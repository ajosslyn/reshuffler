import React, { useState } from 'react';
import './Login.css';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Add this function to generate a code verifier and challenge for PKCE
  const generateCodeVerifier = () => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(64);
    window.crypto.getRandomValues(randomValues);
    
    let verifier = '';
    for (let i = 0; i < randomValues.length; i++) {
      verifier += possible.charAt(randomValues[i] % possible.length);
    }
    
    return verifier;
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Generate a random state for security
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('spotify_auth_state', state);
      
      // Generate the code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Store code verifier in localStorage - THIS IS CRITICAL
      localStorage.setItem('code_verifier', codeVerifier);
      console.log('Code verifier stored, length:', codeVerifier.length);
      
      // Build the authorization URL
      const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback';
      
      // Required scopes for Premium playback
      const scopes = [
        'streaming',              // Essential for Web Playback SDK
        'user-read-email',
        'user-read-private',      // Needed to check Premium status
        'user-library-read',
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-read-playback-state',
        'user-modify-playback-state'
      ].join(' ');
      
      const authUrl = 
        'https://accounts.spotify.com/authorize' +
        `?client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${codeChallenge}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${state}`;
      
      // Redirect to Spotify authorization
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
    }
  };

  const SpotifyIcon = () => (
    <svg className="spotify-icon" viewBox="0 0 24 24">
      <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.568 17.568c-.24.4-.76.52-1.16.28-3.16-1.92-7.14-2.36-11.84-1.28-.44.12-.88-.16-1-.6-.12-.44.16-.88.6-1 5.12-1.16 9.56-.64 13.04 1.48.4.24.52.76.28 1.16zm1.64-3.64c-.32.52-.88.68-1.4.32-3.68-2.24-9.28-2.88-13.64-1.56-.52.16-1.08-.12-1.24-.64-.16-.52.12-1.08.64-1.24 5.04-1.52 11.32-.8 15.48 1.8.52.32.68.88.32 1.4zm.16-3.8c-4.4-2.6-11.64-2.84-15.84-1.56-.64.2-1.32-.16-1.52-.8-.2-.64.16-1.32.8-1.52 4.84-1.48 12.84-1.2 18.04 1.8.6.36.8 1.16.44 1.76-.36.6-1.16.8-1.76.44z"/>
    </svg>
  );
  
  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-logo">
          MS
        </div>
        
        <h1 className="login-heading">Music Shuffler</h1>
        <p className="login-subtitle">
          Smart playlist grouping powered by your Spotify taste
        </p>
        
        <button 
          onClick={handleLogin} 
          className="login-button" 
          disabled={isLoading}
        >
          <SpotifyIcon />
          {isLoading ? 'Connecting...' : 'Continue with Spotify'}
        </button>
        
        <div className="login-features">
          <h3>What you'll get:</h3>
          <ul>
            <li>Smart playlist organization</li>
            <li>AI-powered music grouping</li>
            <li>Premium Spotify playback</li>
            <li>Last.fm integration</li>
            <li>Cross-playlist analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;