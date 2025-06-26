export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }
    
    // Check for environment variables
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error('Missing Spotify credentials in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Debug environment variables (safely)
    console.log('Client ID length:', process.env.SPOTIFY_CLIENT_ID.length);
    console.log('Client Secret length:', process.env.SPOTIFY_CLIENT_SECRET.length);
    
    // Use environment variable if set, otherwise use local URL
    const redirectUri = process.env.REACT_APP_REDIRECT_URI || 'http://127.0.0.1:5173/callback';
    
    // Create authorization string manually
    const clientId = process.env.SPOTIFY_CLIENT_ID.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET.trim();
    const authString = `${clientId}:${clientSecret}`;
    
    // Use proper Base64 encoding
    let base64Auth;
    try {
      // For Node.js environment
      if (typeof Buffer !== 'undefined') {
        base64Auth = Buffer.from(authString).toString('base64');
      } 
      // For browser/Edge environment
      else {
        base64Auth = btoa(authString);
      }
    } catch (e) {
      console.error('Base64 encoding error:', e);
      return res.status(500).json({ error: 'Authentication encoding error' });
    }
    
    console.log('Auth string created, length:', authString.length);
    
    // Set up request to Spotify token API
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    
    // Make the request to Spotify
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64Auth}`
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify token error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const tokenData = await response.json();
    
    return res.status(200).json({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });
  } catch (error) {
    console.error('Token exchange error:', error.message, error.stack);
    return res.status(500).json({ error: error.message || 'Failed to exchange token' });
  }
}