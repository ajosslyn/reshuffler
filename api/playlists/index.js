const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    
    // Fetch user's playlists
    const response = await spotifyApi.getUserPlaylists();
    
    return res.status(200).json(response.body);
  } catch (error) {
    console.error('Playlist fetch error:', error.message);
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to fetch playlists'
    });
  }
};