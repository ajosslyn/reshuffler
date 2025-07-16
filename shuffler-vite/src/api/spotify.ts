import { refreshToken, logout } from '../utils/auth';

// Add this interface definition for RequestOptions
interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal;
}

// Create a wrapper function for API calls
export const spotifyApiRequest = async (url: string, options: RequestOptions = {}) => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  const requestOptions: RequestOptions = {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${accessToken}`
    }
  };
  
  try {
    // Call Spotify API directly for endpoints not handled by your serverless functions
    let response = await fetch(url, requestOptions);
    
    // Handle 401 by trying to refresh token
    if (response.status === 401) {
      console.log('Token expired, attempting to refresh...');
      const refreshed = await refreshToken();
      
      if (refreshed) {
        // Retry with new token
        const newToken = localStorage.getItem('accessToken');
        const newOptions = {
          ...options,
          headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${newToken}`
          }
        };
        
        response = await fetch(url, newOptions);
      } else {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Make sure your fetchPlaylists function is properly implemented

// Use your serverless functions for key operations
export const fetchPlaylists = async () => {
  try {
    // First, ensure we have a valid token
    await refreshTokenIfNeeded();
    
    // Then make the API call
    const data = await spotifyApiRequest('https://api.spotify.com/v1/me/playlists');
    
    if (!data || !data.items) {
      console.error('Unexpected response format from playlists endpoint:', data);
      throw new Error('Invalid response format from Spotify API');
    }
    
    return data.items;
  } catch (error: unknown) {
    console.error('Error fetching playlists:', error);
    
    // Type guard to safely access error properties
    const err = error as { response?: { status: number }, message?: string };
    
    // Check if error is due to auth issues
    if (err.response?.status === 401 || (err.message && err.message.includes('token'))) {
      console.log('Authentication error, attempting token refresh...');
      
      // Force token refresh regardless of expiration
      const refreshed = await forceTokenRefresh();
      if (refreshed) {
        // Retry the request with new token
        return spotifyApiRequest('https://api.spotify.com/v1/me/playlists')
          .then(data => data.items);
      }
    }
    
    throw new Error(`Playlists fetch failed: ${err.response?.status || err.message || 'Unknown error'}`);
  }
};

// Add this helper function
const refreshTokenIfNeeded = async () => {
  const tokenExpiration = localStorage.getItem('tokenExpiration');
  const currentTime = Date.now();
  
  // Refresh if token is expired or will expire in next 5 minutes
  if (!tokenExpiration || parseInt(tokenExpiration) - currentTime < 300000) {
    console.log('Token expired or expiring soon, refreshing...');
    return refreshToken();
  }
  
  return Promise.resolve(true);
};

// Add this function to force a token refresh
const forceTokenRefresh = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      window.location.href = '/login';
      return false;
    }
    
    const response = await fetch('/api/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('tokenExpiration', String(Date.now() + (data.expiresIn * 1000)));
    
    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    window.location.href = '/login';
    return false;
  }
};

// Fetch details of a specific playlist
export const fetchPlaylistDetails = async (playlistId: string) => {
  try {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }
    
    // Use the spotifyApiRequest wrapper to handle auth and errors
    const data = await spotifyApiRequest(`https://api.spotify.com/v1/playlists/${playlistId}`);
    console.log(`Fetched details for playlist: ${data.name}`);
    return data;
  } catch (error) {
    console.error(`Error fetching playlist details for ${playlistId}:`, error);
    throw error;
  }
};

// Fetch tracks of a specific playlist
export const fetchPlaylistTracks = async (playlistId: string) => {
  try {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }
    
    // Use the spotifyApiRequest wrapper to handle auth and errors
    const data = await spotifyApiRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
    console.log(`Fetched ${data.items?.length || 0} tracks for playlist ${playlistId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
    throw error;
  }
};

export const fetchUserProfile = async () => {
  try {
    // Use the spotifyApiRequest wrapper to handle authentication and errors
    const data = await spotifyApiRequest('https://api.spotify.com/v1/me');
    console.log('User profile received:', data.display_name);
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Add these new functions for Spotify Web Playback SDK

export const transferPlaybackToDevice = async (deviceId: string) => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    // First check if device still exists
    const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (devicesResponse.ok) {
      const devicesData = await devicesResponse.json();
      const targetDevice = devicesData.devices?.find((device: any) => device.id === deviceId);
      
      if (!targetDevice) {
        throw new Error('device_not_found: Device not found in available devices');
      }
    }
    
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false  // Set to false to avoid auto-play
      })
    });
    
    // 204 No Content is a success response for this endpoint
    if (response.status !== 204 && !response.ok) {
      if (response.status === 404) {
        throw new Error('device_not_found: Device not found or expired');
      }
      
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Failed to transfer playback: ${errorData.error?.message || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in transferPlaybackToDevice:', error);
    throw error;
  }
};

export const playTrackOnDevice = async (trackUri: string, deviceId: string) => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    // First verify device is available
    const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (devicesResponse.ok) {
      const devicesData = await devicesResponse.json();
      const targetDevice = devicesData.devices?.find((device: any) => device.id === deviceId);
      
      if (!targetDevice) {
        throw new Error('device_not_found: Device not found in available devices');
      }
      
      // If device is not active, try to transfer playback first
      if (!targetDevice.is_active) {
        console.log('Device is not active, transferring playback first...');
        await transferPlaybackToDevice(deviceId);
        // Wait for transfer to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        uris: [trackUri]
      })
    });
    
    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 404) {
        throw new Error('device_not_found: Playback device not found or expired');
      }
      if (response.status === 403) {
        throw new Error('forbidden: Premium subscription required for this feature');
      }
      if (response.status === 429) {
        throw new Error('rate_limit: Too many requests, please try again later');
      }
      
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Failed to play track: ${errorData.error?.message || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in playTrackOnDevice:', error);
    throw error;
  }
};

// Add this function to your spotify.ts file
export const playPlaylistOnDevice = async (playlistUri: string, deviceId: string, position: number = 0) => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    // First verify the device is still active
    const checkResponse = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // If device not found or not active, try to reactivate it
    if (!checkResponse.ok || checkResponse.status === 204) {
      console.log('Device not found or inactive, attempting to transfer playback first');
      
      await transferPlaybackToDevice(deviceId);
      // Wait a moment for the transfer to take effect
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Now attempt to play the playlist
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        context_uri: playlistUri,
        offset: { position }
      })
    });
    
    // Handle error responses
    if (!response.ok) {
      // If device not found, throw specific error
      if (response.status === 404) {
        throw new Error('device_not_found: Playback device not found. Please refresh the page.');
      }
      
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(`Failed to play playlist: ${errorData.error?.message || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in playPlaylistOnDevice:', error);
    throw error;
  }
};

// Add this function to check device health
export const checkDeviceHealth = async (deviceId: string) => {
  const accessToken = localStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch devices: ${response.statusText}`);
    }
    
    const data = await response.json();
    const device = data.devices?.find((d: any) => d.id === deviceId);
    
    return {
      exists: !!device,
      isActive: device?.is_active || false,
      name: device?.name || 'Unknown',
      type: device?.type || 'Unknown'
    };
  } catch (error) {
    console.error('Error checking device health:', error);
    return {
      exists: false,
      isActive: false,
      name: 'Unknown',
      type: 'Unknown'
    };
  }
};