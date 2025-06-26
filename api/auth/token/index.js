require('dotenv').config();
const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  // Immediately log available environment variables
  console.log('API environment check:');
  console.log('- SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? '✓ Found' : '❌ Missing');
  console.log('- SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET ? '✓ Found' : '❌ Missing');
  console.log('- REACT_APP_REDIRECT_URI:', process.env.REACT_APP_REDIRECT_URI ? '✓ Found' : '❌ Missing');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Token exchange request received');
    const { code } = req.body;
    
    if (!code) {
      console.log('No code provided in request');
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Add more debugging for the code
    console.log('Authorization code length:', code.length);
    console.log('Authorization code first/last chars:', 
      code.substring(0, 4) + '...' + code.substring(code.length - 4));
    
    console.log('Using client ID:', process.env.SPOTIFY_CLIENT_ID?.substring(0, 5) + '...');
    console.log('Client secret available:', !!process.env.SPOTIFY_CLIENT_SECRET);
    
    // Make absolutely sure redirect URI matches exactly
    const redirectUri = process.env.REACT_APP_REDIRECT_URI || 'http://127.0.0.1:5173/callback';
    console.log('Exact redirect URI being used:', redirectUri);
    
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: redirectUri
    });
    
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log('Token exchange successful');
    
    return res.status(200).json({
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in
    });
  } catch (error) {
    console.error('Token exchange error:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Failed to exchange code for token'
    });
  }
};