import axios from 'axios';
import { IPlaylist } from '../models/Playlist';
import { TrackMetadata } from '../types/index';

const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export class SpotifyService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    async fetchUserPlaylists(userId: string): Promise<IPlaylist[]> {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/users/${userId}/playlists`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });
        return response.data.items;
    }

    async fetchPlaylistTracks(playlistId: string): Promise<TrackMetadata[]> {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });
        return response.data.items.map((item: any) => item.track);
    }

    async searchTracks(query: string): Promise<TrackMetadata[]> {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
            params: {
                q: query,
                type: 'track',
            },
        });
        return response.data.tracks.items;
    }

}

export const getSpotifyPlaylists = async (accessToken: string) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me/playlists`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlists:', error);
        throw error;
    }
};

export const getTrackMetadata = async (trackId: string, accessToken: string) => {
    try {
         // Implement the actual API call to fetch track metadata
         // This is a placeholder implementation
         const response = await axios.get(`${SPOTIFY_API_BASE_URL}/tracks/${trackId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching track metadata:', error);
        throw error;
    }
};

export const getPlaylists = async (accessToken: string) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me/playlists`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlists:', error);
        throw error;
    }
};

export const getPlaylistTracks = async (playlistId: string, accessToken: string) => {
    try {
        const response = await axios.get(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.data.items;
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        throw error;
    }
};


