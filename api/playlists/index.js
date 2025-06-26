const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  console.log('=== Playlists API called ===');
  console.log('Auth header:', req.headers.authorization ? 'Present' : 'Missing');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {

     // Log the request for debugging
     console.log('API Request:', req.url);

    // Get the access token from request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth header invalid:', authHeader);
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Token extraction failed');
      return res.status(401).json({ error: 'Missing token' });
    }

    console.log('Token extracted, first chars:', token.substring(0, 10));
    
    // Initialize Spotify API wrapper
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    });
    
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