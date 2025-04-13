export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    playlists: string[]; // Array of Playlist IDs
}

export interface Track {
    id: string;
    name: string;
    artist: string;
    album: string;
    genre: string;
    tempo: number; // BPM
    language: string;
}

export interface Playlist {
    id: string;
    name: string;
    description: string;
    tracks: Track[];
    userId: string; // ID of the user who owns the playlist
}

export interface GroupedTracks {
    genre?: Track[];
    tempo?: Track[];
    artist?: Track[];
    language?: Track[];
}


// Add the missing TrackMetadata export
export interface TrackMetadata {
    title: string;
    artists: string;
    album: string;
    genre: string;
    tempo: number;
    beat: string;
    language: string;
}