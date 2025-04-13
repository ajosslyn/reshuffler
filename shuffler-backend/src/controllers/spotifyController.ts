import { Request, Response } from 'express';
import { getSpotifyPlaylists, getTrackMetadata } from '../services/spotifyService';

// Define custom request interface with user property
interface AuthenticatedRequest extends Request {
  user: {
    accessToken: string;
    [key: string]: any;  // For any other user properties
  };
}

export const fetchPlaylists = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Cast request to AuthenticatedRequest or use optional chaining
        const playlists = await getSpotifyPlaylists(req.user?.accessToken || '');
        res.status(200).json(playlists);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching playlists', error });
    }
};

export const fetchTrackMetadata = async (req: AuthenticatedRequest, res: Response) => {
    const { trackId } = req.params;
    try {
        const metadata = await getTrackMetadata(trackId, req.user.accessToken);
        res.status(200).json(metadata);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching track metadata', error });
    }
};