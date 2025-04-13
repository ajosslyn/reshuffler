import { Track } from '../types'; // Adjust the import based on your actual Track type location

export const groupByGenre = (tracks: Track[]): Record<string, Track[]> => {
    return tracks.reduce((acc, track) => {
        const genre = track.genre || 'Unknown';
        if (!acc[genre]) {
            acc[genre] = [];
        }
        acc[genre].push(track);
        return acc;
    }, {} as Record<string, Track[]>);
};

export const groupByTempo = (tracks: Track[]): Record<string, Track[]> => {
    return tracks.reduce((acc, track) => {
        const tempoRange = getTempoRange(track.tempo);
        if (!acc[tempoRange]) {
            acc[tempoRange] = [];
        }
        acc[tempoRange].push(track);
        return acc;
    }, {} as Record<string, Track[]>);
};

const getTempoRange = (tempo: number): string => {
    if (tempo < 60) return 'Slow';
    if (tempo < 120) return 'Moderate';
    return 'Fast';
};

export const groupByArtist = (tracks: Track[]): Record<string, Track[]> => {
    return tracks.reduce((acc, track) => {
        const artist = track.artist || 'Various Artists';
        if (!acc[artist]) {
            acc[artist] = [];
        }
        acc[artist].push(track);
        return acc;
    }, {} as Record<string, Track[]>);
};

export const groupByLanguage = (tracks: Track[]): Record<string, Track[]> => {
    return tracks.reduce((acc, track) => {
        const language = track.language || 'Unknown';
        if (!acc[language]) {
            acc[language] = [];
        }
        acc[language].push(track);
        return acc;
    }, {} as Record<string, Track[]>);
};

export const groupTracksByMetadata = (
    tracks: Track[],
    groupingAlgorithm: 'genre' | 'tempo' | 'artist' | 'language'
): Record<string, Track[]> => {
    switch (groupingAlgorithm) {
        case 'genre':
            return groupByGenre(tracks);
        case 'tempo':
            return groupByTempo(tracks);
        case 'artist':
            return groupByArtist(tracks);
        case 'language':
            return groupByLanguage(tracks);
        default:
            throw new Error('Invalid grouping algorithm');
    }
}