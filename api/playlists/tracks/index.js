const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  // Add debug logging at the start of the function
  console.log('=== Playlist Tracks API called ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query params:', req.query);
  console.log('Method:', req.method);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get the playlistId from query params
    const { playlistId } = req.query;
    console.log('Requested playlistId:', playlistId);
    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    // Get the access token from request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    
    // Initialize Spotify API wrapper
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token);
    
    // Log before Spotify API call
    console.log('Calling Spotify API getPlaylistTracks() for playlist:', playlistId);
    
    // Fetch playlist tracks
    const response = await spotifyApi.getPlaylistTracks(playlistId);
    
    // Log response info
    console.log('Spotify API response status:', response.statusCode);
    console.log('Track count:', response.body.items?.length || 0);
    
    return res.status(200).json(response.body);
  } catch (error) {
    console.error('Playlist tracks fetch error:', error.message);
    console.error('Error stack:', error.stack);
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to fetch playlist tracks'
    });
  }
};