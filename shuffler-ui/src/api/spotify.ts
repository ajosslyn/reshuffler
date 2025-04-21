import axios from 'axios';

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export const fetchPlaylists = async (accessToken: string) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me/playlists`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlists:', error);
        throw error;
    }
};

export const fetchPlaylistTracks = async (accessToken: string, playlistId: string) => {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Error fetching playlist tracks: ${response.statusText}`);
    }

    return await response.json();
};

export const searchTracks = async (query: string, accessToken: string) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            params: {
                q: query,
                type: 'track',
            },
        });
        return response.data.tracks.items;
    } catch (error) {
        console.error('Error searching tracks:', error);
        throw error;
    }
};

// Spotify API functions

export const fetchTrackMetadata = async (playlistId: string) => {
  try {
    // Implement the actual API call to fetch track metadata
    // This is a placeholder implementation
    const response = await fetch(`/api/playlists/${playlistId}/tracks`);
    if (!response.ok) {
      throw new Error('Failed to fetch track metadata');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching track metadata:', error);
    throw error;
  }
};

export const fetchPlaylistDetails = async (accessToken: string, playlistId: string) => {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Error fetching playlist details: ${response.statusText}`);
  }

  return await response.json();
};

// Comment out the fetchAudioFeatures function since we're not using it anymore
/*
export const fetchAudioFeatures = async (accessToken: string, trackIds: string[]) => {
  // Code removed - we're using our estimator instead
};
*/

// export const fetchAudioFeatures = async (accessToken: string, trackIds: string[]) => {
//   if (!trackIds || trackIds.length === 0) {
//     console.warn("No track IDs provided for audio features");
//     return { audio_features: [] };
//   }

//   // Join track IDs but limit to 100 per request (Spotify API limit)
//   const ids = trackIds.slice(0, 100).join(',');
  
//   try {
//     const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
//       headers: {
//         'Authorization': `Bearer ${accessToken}`
//       }
//     });

//     if (response.status === 401 || response.status === 403) {
//       // For both 401 and 403, we should consider prompting a re-login
//       localStorage.setItem('skipAudioFeatures', 'true'); // Skip future attempts
      
//       // If we get 3+ permission failures, force a logout
//       const permissionErrors = parseInt(localStorage.getItem('permissionErrors') || '0') + 1;
//       localStorage.setItem('permissionErrors', permissionErrors.toString());
      
//       if (permissionErrors >= 3) {
//         console.warn("Multiple permission errors, redirecting to login...");
//         localStorage.removeItem('accessToken'); // Clear token
//         window.location.href = '/login?reason=permissions'; // Redirect with reason
//         return { audio_features: [] };
//       }
      
//       return { audio_features: [] };
//     }
    
//     // Reset permission errors counter on success
//     localStorage.removeItem('permissionErrors');
    
//     if (!response.ok) {
//       console.error(`Error fetching audio features: ${response.statusText}`);
//       return { audio_features: [] };
//     }

//     return await response.json();
//   } catch (error) {
//     console.error("Error in fetchAudioFeatures:", error);
//     return { audio_features: [] };
//   }
// };

export const fetchUserProfile = async (accessToken: string) => {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};