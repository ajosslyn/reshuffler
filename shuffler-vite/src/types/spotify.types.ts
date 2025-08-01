export interface Track {
    id: string;
    name: string;
    artist: string;
    album: string;
    genre: string;
    tempo: number;
    language: string;
    duration: number; // in seconds
    playlistName?: string; // Optional playlist name for multi-playlist grouping
    playlistId?: string; // Optional playlist ID for multi-playlist grouping
    albumArt?: string; // Album art URL
}

export interface Playlist {
    id: string;
    name: string;
    description: string;
    tracks: Track[];
    owner: string;
}

export interface SpotifyResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}