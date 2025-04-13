import { TrackMetadata } from '../types/app.types';

export const analyzeVibe = (tracks: TrackMetadata[]): string => {
    const vibeScores = tracks.map(track => {
        const { genre, tempo, energy } = track;
        
        // Enhanced genre scoring with global music genres
        let genreScore = 0.5; // default middle score
        
        if (genre) {
            const genreLower = genre.toLowerCase();
            
            // Upbeat genres
            if (genreLower.includes('reggaeton') || 
                genreLower.includes('afrobeats') ||
                genreLower.includes('dance') || 
                genreLower.includes('edm') ||
                genreLower.includes('pop') ||
                genreLower.includes('rock') ||
                genreLower.includes('hip hop') ||
                genreLower.includes('rap')) {
                genreScore = 0.8;
            }
            // Chill genres
            else if (genreLower.includes('amapiano') ||
                    genreLower.includes('lofi') ||
                    genreLower.includes('chill') ||
                    genreLower.includes('r&b') ||
                    genreLower.includes('soul')) {
                genreScore = 0.5;
            }
            // Relaxed genres
            else if (genreLower.includes('ambient') ||
                    genreLower.includes('classical') ||
                    genreLower.includes('jazz') ||
                    genreLower.includes('folk')) {
                genreScore = 0.2;
            }
        }
        
        // Normalize tempo to a 0-1 scale (assuming most tempo values are between 60-180)
        const normalizedTempo = Math.min(Math.max((tempo || 120) - 60, 0) / 120, 1);
        
        // Energy already on 0-1 scale
        const energyScore = energy || 0.5;
        
        // Calculate combined score with weighted factors
        // Giving more weight to energy and tempo for better categorization
        return (energyScore * 0.5) + (normalizedTempo * 0.3) + (genreScore * 0.2);
    });

    const averageScore = vibeScores.reduce((acc, score) => acc + score, 0) / vibeScores.length;

    // More balanced thresholds for better distribution
    if (averageScore > 0.66) {
        return 'Upbeat';
    } else if (averageScore > 0.33) {
        return 'Chill';
    } else {
        return 'Relaxed';
    }
};

export const groupTracksByVibe = (tracks: TrackMetadata[]): Record<string, TrackMetadata[]> => {
    const vibes: Record<string, TrackMetadata[]> = {
        Upbeat: [],
        Chill: [],
        Relaxed: []
    };
    
    // If no tracks, ensure we still return the structure
    if (!tracks || tracks.length === 0) {
        return vibes;
    }
    
    // First pass: analyze and distribute tracks
    tracks.forEach(track => {
        const vibe = analyzeVibe([track]);
        vibes[vibe].push(track);
    });
    
    // Second pass: ensure each vibe has at least some tracks
    // This helps ensure playlists for all vibes even with unbalanced data
    const nonEmptyVibes = Object.entries(vibes)
        .filter(([_, tracks]) => tracks.length > 0)
        .map(([vibe]) => vibe);
        
    if (nonEmptyVibes.length > 0 && nonEmptyVibes.length < 3) {
        const emptyVibes = Object.entries(vibes)
            .filter(([_, tracks]) => tracks.length === 0)
            .map(([vibe]) => vibe);
            
        // Find the vibe with most tracks to redistribute
        const sourceVibe = Object.entries(vibes)
            .sort(([_, tracksA], [__, tracksB]) => tracksB.length - tracksA.length)[0][0];
            
        // Redistribute tracks to empty categories
        emptyVibes.forEach(emptyVibe => {
            const tracksToMove = Math.ceil(vibes[sourceVibe].length * 0.25); // Take 25% of tracks
            
            if (tracksToMove > 0 && vibes[sourceVibe].length > tracksToMove) {
                // Select tracks for redistribution - prefer tracks close to the target vibe boundary
                const sortedSourceTracks = [...vibes[sourceVibe]];
                
                // Sort differently based on target vibe
                if (emptyVibe === 'Chill' && sourceVibe === 'Upbeat') {
                    // Find the least upbeat tracks from Upbeat category
                    sortedSourceTracks.sort((a, b) => {
                        // Approximate energy comparison
                        return a.energy - b.energy;
                    });
                } else if (emptyVibe === 'Relaxed' && sourceVibe === 'Chill') {
                    // Find the most relaxed tracks from Chill category
                    sortedSourceTracks.sort((a, b) => {
                        return a.energy - b.energy;
                    });
                } else {
                    // Generic sorting
                    sortedSourceTracks.sort(() => Math.random() - 0.5);
                }
                
                // Move tracks from the sorted array
                const movedTracks = sortedSourceTracks.slice(0, tracksToMove);
                vibes[emptyVibe] = movedTracks;
                
                // Remove the moved tracks from source
                vibes[sourceVibe] = vibes[sourceVibe].filter(
                    track => !movedTracks.some(movedTrack => movedTrack.id === track.id)
                );
                
                console.log(`Redistributed ${tracksToMove} tracks from ${sourceVibe} to ${emptyVibe}`);
            }
        });
    }
    
    return vibes;
};