import { TrackMetadata } from '../types/app.types';

export interface GroupedTracks {
  [key: string]: TrackMetadata[];
}

export function groupTracksByMetadata(tracks: TrackMetadata[], criteria: keyof TrackMetadata): GroupedTracks {
  const groupedTracks: GroupedTracks = {};

  tracks.forEach(track => {
    if (!track) {
      console.error("Track is undefined!");
      return;
    }
    
    const key = track[criteria];
    if (key !== undefined && key !== null) {
      const stringKey = String(key);
      if (stringKey in groupedTracks) {
        groupedTracks[stringKey].push(track);
      } else {
        groupedTracks[stringKey] = [track];
      }
    }
  });

  return groupedTracks;
}

export const groupTracksByGenre = (tracks: TrackMetadata[]): GroupedTracks => {
  // First, try to detect genres if they're not already assigned
  const tracksWithGenre = tracks.map(track => {
    if (track.genre && track.genre !== 'Unknown') {
      return track;
    }
    
    // Try to infer genre from track name or artist
    let inferredGenre = 'Other';
    const nameLower = (track.name || '').toLowerCase();
    const artistLower = (track.artist || '').toLowerCase();
    
    // EDM/Electronic detection
    if (
      artistLower.includes('dj') ||
      artistLower.includes('electronic') ||
      nameLower.includes('remix') ||
      nameLower.includes('edm')
    ) {
      inferredGenre = 'Electronic/Dance';
    }
    // Hip-hop detection
    else if (
      artistLower.includes('rapper') ||
      nameLower.includes('rap') ||
      nameLower.includes('hip hop') ||
      nameLower.includes('trap')
    ) {
      inferredGenre = 'Hip Hop/Rap';
    }
    // Pop detection
    else if (
      nameLower.includes('pop') ||
      artistLower.includes('pop')
    ) {
      inferredGenre = 'Pop';
    }
    // R&B detection
    else if (
      nameLower.includes('r&b') ||
      artistLower.includes('r&b') ||
      nameLower.includes('rnb')
    ) {
      inferredGenre = 'R&B/Soul';
    }
    // Reggaeton/Latin detection
    else if (
      nameLower.includes('reggaeton') ||
      artistLower.includes('latin') ||
      nameLower.includes('latino')
    ) {
      inferredGenre = 'Reggaeton/Latin';
    }
    // Afrobeats detection
    else if (
      nameLower.includes('afro') ||
      nameLower.includes('afrobeats') ||
      artistLower.includes('afro')
    ) {
      inferredGenre = 'Afrobeats';
    }
    // Amapiano detection
    else if (
      nameLower.includes('amapiano') ||
      artistLower.includes('amapiano')
    ) {
      inferredGenre = 'Amapiano';
    }
    
    return { ...track, genre: inferredGenre };
  });
  
  // Group by the genre
  return groupTracksByMetadata(tracksWithGenre, 'genre');
};

export const groupTracksByLanguage = (tracks: TrackMetadata[]): GroupedTracks => {
  // Attempt to detect languages if not already assigned
  const tracksWithLanguage = tracks.map(track => {
    if (track.language && track.language !== 'Unknown') {
      return track;
    }
    
    // Try to infer language from track name, artist or genre
    let inferredLanguage = 'Unknown';
    const nameLower = (track.name || '').toLowerCase();
    const artistLower = (track.artist || '').toLowerCase();
    const genreLower = (track.genre || '').toLowerCase();
    
    // Reggaeton detection - automatically set to Spanish
    if (genreLower.includes('reggaeton') || 
        nameLower.includes('reggaeton') ||
        artistLower.includes('reggaeton') ||
        nameLower.includes('latino') ||
        artistLower.includes('latin')) {
      return { ...track, language: 'Spanish' };
    }
    
    // English detection (default for most tracks)
    if (!/[^\u0000-\u007F]/.test(nameLower + artistLower)) {
      inferredLanguage = 'English';
    }
    // Spanish detection
    else if (
      nameLower.includes('ñ') ||
      nameLower.includes('é') ||
      nameLower.includes('á') ||
      nameLower.includes('ó') ||
      artistLower.includes('spanish') ||
      artistLower.includes('latin') ||
      nameLower.includes('spanish') ||
      nameLower.includes('español')
    ) {
      inferredLanguage = 'Spanish';
    }
    // French detection
    else if (
      nameLower.includes('ç') ||
      nameLower.includes('è') ||
      nameLower.includes('ê') ||
      artistLower.includes('french') ||
      nameLower.includes('français')
    ) {
      inferredLanguage = 'French';
    }
    // Korean detection
    else if (
      /[\uAC00-\uD7AF]/.test(nameLower + artistLower) ||
      artistLower.includes('korean') ||
      nameLower.includes('k-pop')
    ) {
      inferredLanguage = 'Korean';
    }
    // Japanese detection
    else if (
      /[\u3040-\u309F\u30A0-\u30FF]/.test(nameLower + artistLower) ||
      artistLower.includes('japanese') ||
      nameLower.includes('j-pop')
    ) {
      inferredLanguage = 'Japanese';
    }
    // Mandarin/Chinese detection
    else if (
      /[\u4E00-\u9FFF]/.test(nameLower + artistLower) ||
      artistLower.includes('chinese') ||
      nameLower.includes('c-pop')
    ) {
      inferredLanguage = 'Chinese';
    }
    // Portuguese detection
    else if (
      nameLower.includes('ã') ||
      nameLower.includes('ç') ||
      nameLower.includes('ê') ||
      artistLower.includes('brazil') ||
      artistLower.includes('brasil') ||
      nameLower.includes('portuguese')
    ) {
      inferredLanguage = 'Portuguese';
    }
    // African languages (broad category)
    else if (
      artistLower.includes('african') ||
      nameLower.includes('swahili') ||
      nameLower.includes('afro') ||
      nameLower.includes('yoruba') ||
      nameLower.includes('igbo')
    ) {
      inferredLanguage = 'African';
    }
    
    return { ...track, language: inferredLanguage };
  });
  
  // Group by the language
  return groupTracksByMetadata(tracksWithLanguage, 'language');
};

export const groupTracksByArtist = (tracks: TrackMetadata[]): GroupedTracks => {
  return groupTracksByMetadata(tracks, 'artist');
};

// Export combined grouping function for use in SmartGrouping component
export const groupTracks = (tracks: TrackMetadata[], criteria: string): GroupedTracks => {
  switch (criteria.toLowerCase()) {
    case 'genre':
      return groupTracksByGenre(tracks);
    case 'language':
      return groupTracksByLanguage(tracks);
    case 'artist':
      return groupTracksByArtist(tracks);
    default:
      console.error(`Unknown grouping criteria: ${criteria}`);
      return {};
  }
};