export interface Track {
    id: string;
    name: string;
    artist: string;
    album: string;
    genre: string;
    tempo: number;
    language: string;
    duration: number; // in seconds
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