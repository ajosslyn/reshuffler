import { useState, useEffect } from 'react';
import axios from 'axios';

const useTrackMetadata = (trackId: string) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [_loading, setLoading] = useState<boolean>(false);
  const [_error, setError] = useState<any>(null);

  useEffect(() => {
    if (!trackId) return;
    
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setMetadata({
          id: response.data.id,
          title: response.data.name,
          artist: response.data.artists.map((artist: any) => artist.name).join(', '),
          album: response.data.album.name,
          albumArt: response.data.album.images[0]?.url,
          previewUrl: response.data.preview_url
        });
      } catch (err) {
        setError(err);
        console.error('Error fetching track metadata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [trackId]);

  return metadata;
};

export default useTrackMetadata;