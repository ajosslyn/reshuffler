const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { playlistId } = req.query;
  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlist ID' });
  }

  // Get the access token from request headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Initialize Spotify API wrapper
    const spotifyApi = new SpotifyWebApi();
    spotifyApi.setAccessToken(token);
    
    // Fetch playlist tracks
    const response = await spotifyApi.getPlaylistTracks(playlistId);
    
    return res.status(200).json(response.body);
  } catch (error) {
    console.error('Track fetch error:', error.message);
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to fetch tracks'
    });
  }
};