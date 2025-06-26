export interface TrackMetadata {
  id: string;
  name: string;
  artist: string;
  genre: string;        // Not optional
  language: string;     // Not optional
  energy: number;       // Not optional
  tempo: number;        // Not optional
  preview_url?: string; // Optional (marked with ?)
  [key: string]: any;   // For additional properties
}

export interface Playlist {
    images?: { url: string }[];
    description: string;
    id: string;
    name: string;
    tracks: TrackMetadata[];
}

export interface GroupedTracks {
    genre: string;
    tempoRange: string;
    tracks: TrackMetadata[];
}


export interface SpotifyAudioFeatures {
    id: string;
    energy: number;
    tempo: number;
    danceability?: number;
    valence?: number;
    acousticness?: number;
    instrumentalness?: number;
    liveness?: number;
    speechiness?: number;
  }

export interface AppState {
    playlists: Playlist[];
    currentPlaylist: Playlist | null;
    isLoading: boolean;
    error: string | null;
}