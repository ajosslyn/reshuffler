export default async function handler(req, res) {
  // Get access token from request headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify playlists error:', errorText);
      return res.status(response.status).json({ error: errorText });
    }
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return res.status(500).json({ error: error.message });
  }
}