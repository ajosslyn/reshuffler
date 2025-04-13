import { Request, Response } from 'express';
import Playlist from '../models/Playlist';
import { groupTracksByMetadata } from '../utils/groupingAlgorithms';

// Create a new playlist
export const createPlaylist = async (req: Request, res: Response) => {
    try {
        const { name, tracks } = req.body;
        const newPlaylist = new Playlist({ name, tracks });
        await newPlaylist.save();
        res.status(201).json(newPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Error creating playlist', error });
    }
};

// Get all playlists
export const getPlaylists = async (req: Request, res: Response) => {
    try {
        const playlists = await Playlist.find();
        res.status(200).json(playlists);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching playlists', error });
    }
};

// Group tracks in a playlist
export const groupPlaylistTracks = async (req: Request, res: Response) => {
    try {
        const { playlistId } = req.params;
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        const groupedTracks = groupTracksByMetadata(
            playlist.tracks.map(track => ({
                id: track.id,
                name: track.name,
                album: track.album,
                genre: track.genre,
                artist: track.artist,
                tempo: track.tempo,
                language: track.language,
            })),
            'genre'
        ); // Replace 'genre' with the desired grouping algorithm
        res.status(200).json(groupedTracks);
    } catch (error) {
        res.status(500).json({ message: 'Error grouping tracks', error });
    }
}

export const updatePlaylist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, tracks } = req.body;

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            id,
            { name, tracks },
            { new: true } // Return the updated document
        );

        if (!updatedPlaylist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        res.status(200).json(updatedPlaylist);
    } catch (error) {
        res.status(500).json({ message: 'Error updating playlist', error });
    }
};


export const deletePlaylist = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const deletedPlaylist = await Playlist.findByIdAndDelete(id);

        if (!deletedPlaylist) {
            return res.status(404).json({ message: 'Playlist not found' });
        }

        res.status(200).json({ message: 'Playlist deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting playlist', error });
    }
};