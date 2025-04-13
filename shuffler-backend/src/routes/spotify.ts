import express, { Request, Response, NextFunction, Router } from 'express';
import { getPlaylists, getPlaylistTracks } from '../services/spotifyService';

const router: Router = express.Router();

// Define custom request interface with user property
interface AuthenticatedRequest extends Request {
  user: {
    accessToken: string;
    [key: string]: any;  // For any other user properties
  };
}

// Authentication middleware (example)
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // In a real application, you would verify the access token here
  const accessToken = req.headers.authorization?.split(' ')[1]; // Extract from header

  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Augment the request object
  (req as AuthenticatedRequest).user = { accessToken };
  next();
};

// Route to get user's playlists
router.get('/playlists', authenticate, async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const playlists = await getPlaylists(authReq.user.accessToken);
        res.json(playlists);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Route to get tracks from a specific playlist
router.get('/playlists/:playlistId/tracks', authenticate, async (req: Request, res: Response) => {
    const { playlistId } = req.params;
    try {
        const authReq = req as AuthenticatedRequest;
        const tracks = await getPlaylistTracks(playlistId, authReq.user.accessToken);
        res.json(tracks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch playlist tracks' });
    }
});

export default router;