import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Callback.css'; // Make sure to create this file

const Callback: React.FC = () => {
  const [status, setStatus] = useState('Processing authentication...');
  const navigate = useNavigate();

  useEffect(() => {
    // Extract code and state from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    console.log('Code from URL:', code ? 'Present' : 'Missing');
    console.log('State from URL:', state);
    
    // Get stored state
    const storedState = localStorage.getItem('spotify_auth_state');
    console.log('State from localStorage:', storedState);
    
    // Check for errors
    if (error) {
      setStatus(`Authentication error: ${error}`);
      return;
    }
    
    // Verify state to prevent CSRF
    if (state !== storedState) {
      console.error('State mismatch:', { urlState: state, storedState });
      setStatus('State mismatch. Authentication failed. Try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }
    
    // Exchange code for token
    if (code) {
      console.log('Sending authorization code to backend, length:', code.length);
      const exchangeCodeForToken = async (code: string) => {
        try {
          setStatus('Exchanging code for access token...');
          
          // Get these values from environment variables
          const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
          
          // Debug the actual value (be careful not to log this in production)
          console.log('Client ID first 4 chars:', clientId ? clientId.substring(0, 4) + '...' : 'undefined');
          
          if (!clientId) {
            throw new Error('Client ID is missing. Check your environment variables.');
          }
          
          // Make sure this EXACTLY matches what's registered in Spotify Developer Dashboard
          // and what was used during the initial authorization request
          const redirectUri = import.meta.env.VITE_REDIRECT_URI || 'http://localhost:5173/callback';
          
          // Retrieve the code verifier you stored during login
          const codeVerifier = localStorage.getItem('code_verifier');
          console.log('Code verifier retrieved:', codeVerifier ? 'Found (length: ' + codeVerifier.length + ')' : 'Missing');
          
          if (!codeVerifier) {
            throw new Error('Code verifier not found. Please try logging in again.');
          }
          
          // Create the request body
          const params = new URLSearchParams();
          params.append('client_id', clientId);
          params.append('grant_type', 'authorization_code');
          params.append('code', code);
          params.append('redirect_uri', redirectUri);
          params.append('code_verifier', codeVerifier);
          
          console.log('Making token request with params:', {
            clientId, // Don't log the actual value
            grantType: 'authorization_code',
            codeLength: code.length,
            redirectUri,
            codeVerifierLength: codeVerifier.length
          });
          
          // Make the request to Spotify
          const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Token exchange error response:', errorData);
            throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error || 'Unknown error'}`);
          }
          
          const data = await response.json();
          
          // Store the tokens
          localStorage.setItem('accessToken', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
          }
          
          const expiresAt = Date.now() + (data.expires_in * 1000);
          localStorage.setItem('tokenExpiration', expiresAt.toString());
          
          setStatus('Authentication successful! Redirecting...');
          
          // Clean up state
          localStorage.removeItem('spotify_auth_state');
          
          // Redirect to dashboard
          setTimeout(() => navigate('/dashboard'), 1000);
        } catch (error) {
          console.error('Token exchange error:', error);
          setStatus(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      exchangeCodeForToken(code);
    } else {
      setStatus('No authorization code received. Authentication failed.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [navigate]);
  
  return (
    <div className="callback-container">
      <div className="callback-status">
        <div className="spinner"></div>
        <p>{status}</p>
      </div>
    </div>
  );
};

export default Callback;