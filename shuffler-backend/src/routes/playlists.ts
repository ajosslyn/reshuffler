import express from 'express';
import { getPlaylists, createPlaylist, updatePlaylist, deletePlaylist } from '../controllers/playlistController';

const router = express.Router();

// Route to get all playlists
router.get('/', getPlaylists);

// Route to create a new playlist
router.post('/', createPlaylist);

// Route to update an existing playlist
router.put('/:id', updatePlaylist);

// Route to delete a playlist
router.delete('/:id', deletePlaylist);

export default router;