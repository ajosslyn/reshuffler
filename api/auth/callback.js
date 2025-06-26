const SpotifyWebApi = require('spotify-web-api-node');

module.exports = async (req, res) => {
  console.log("Auth callback called with code:", req.query.code ? "Present" : "Missing");
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.REACT_APP_REDIRECT_URI || 'https://shuffler-ui.vercel.app/callback'
    });
    
    const data = await spotifyApi.authorizationCodeGrant(code);
    console.log("Token exchange successful, expires in:", data.body.expires_in);
    
    return res.status(200).json({
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in
    });
  } catch (error) {
    console.error('Auth callback error:', error.message);
    return res.status(error.statusCode || 500).json({ 
      error: error.message || 'Failed to exchange code for token'
    });
  }
};