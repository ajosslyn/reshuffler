import { TrackMetadata } from '../types'; // Adjust the import based on your types definition

export const extractMetadata = (track: any): TrackMetadata => {
    return {
        title: track.name,
        artists: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        genre: track.genre || 'Unknown',
        tempo: track.tempo || 0,
        beat: track.beat || 'Unknown',
        language: track.language || 'Unknown',
    };
};

export const groupTracksByMetadata = (tracks: any[], criteria: string): Record<string, any[]> => {
    return tracks.reduce((acc: Record<string, any[]>, track: any) => {
        const key = track[criteria] || 'Unknown';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(track);
        return acc;
    }, {});
};