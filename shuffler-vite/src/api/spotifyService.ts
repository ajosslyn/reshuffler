import { spotifyApiRequest } from './spotify';

/**
 * Get user's playlists from Spotify
 */
export const getUserPlaylists = async () => {
  try {
    // Use the spotifyApiRequest wrapper for consistency
    const data = await spotifyApiRequest('https://api.spotify.com/v1/me/playlists');
    console.log('Playlists received:', data.items?.length || 0);
    return data;
  } catch (error) {
    console.error('Error fetching playlists:', error);
    throw error;
  }
};

/**
 * Get tracks from a specific playlist
 */
export const getPlaylistTracks = async (playlistId: string) => {
  try {
    if (!playlistId) {
      throw new Error('Playlist ID is required');
    }
    
    const data = await spotifyApiRequest(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
    console.log(`Tracks received for playlist ${playlistId}:`, data.items?.length || 0);
    return data;
  } catch (error) {
    console.error(`Error fetching tracks for playlist ${playlistId}:`, error);
    throw error;
  }
};