import React from 'react';
import './Login.css';

const Login: React.FC = () => {
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

  // In your handleLogin function:
  const handleLogin = async () => {
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
  };
  
  return (
    <div className="login-container">
      <h1>Music Shuffler</h1>
      <p>Smart playlist grouping based on your music taste</p>
      <button onClick={handleLogin} className="login-button">
        Log in with Spotify
      </button>
    </div>
  );
};

export default Login;