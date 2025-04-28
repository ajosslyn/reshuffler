// Spotify API service for the Music Shuffler application

/**
 * Authentication and API token handling
 */
export const getAuthorizationUrl = (): string => {
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error('Missing Spotify credentials in environment variables');
  }
  
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative'
  ];

  return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
};

export const exchangeCodeForToken = async (code: string): Promise<any> => {
  try {
    // Use relative path for Vercel deployment
    const response = await fetch(`/api/auth/callback?code=${code}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to exchange code for token');
    }
    
    return response.json();
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

/**
 * Playlist operations
 */
export const getUserPlaylists = async (accessToken: string): Promise<any> => {
  try {
    // Use relative path for Vercel deployment
    const response = await fetch('/api/playlists', {
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch playlists');
    }
    
    return response.json();
  } catch (error) {
    console.error('Playlist fetch error:', error);
    throw error;
  }
};

export const getPlaylistTracks = async (accessToken: string, playlistId: string): Promise<any> => {
  try {
    // Use relative path for Vercel deployment
    const response = await fetch(`/api/playlists/tracks?playlistId=${playlistId}`, {
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch playlist tracks');
    }
    
    return response.json();
  } catch (error) {
    console.error('Track fetch error:', error);
    throw error;
  }
};

/**
 * Track operations
 */
export const getTrackFeatures = async (accessToken: string, trackId: string): Promise<any> => {
  try {
    // Use relative path for Vercel deployment
    const response = await fetch(`/api/tracks/features?trackId=${trackId}`, {
      headers: { 
        Authorization: `Bearer ${accessToken}` 
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch track features');
    }
    
    return response.json();
  } catch (error) {
    console.error('Track features error:', error);
    throw error;
  }
};