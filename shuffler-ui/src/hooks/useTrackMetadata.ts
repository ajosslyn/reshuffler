import { useEffect, useState } from 'react';
import { fetchTrackMetadata } from '../api/spotify';

// Define TrackMetadata type locally
interface TrackMetadata {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  // Add other properties as needed
}

const useTrackMetadata = (playlistId: string) => {
    const [metadata, setMetadata] = useState<TrackMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getTrackMetadata = async () => {
            try {
                const data = await fetchTrackMetadata(playlistId);
                setMetadata(data);
            } catch (err) {
                setError('Failed to fetch track metadata');
            } finally {
                setLoading(false);
            }
        };

        getTrackMetadata();
    }, [playlistId]);

    return { metadata, loading, error };
};

export default useTrackMetadata;