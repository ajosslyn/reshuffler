import { TrackMetadata } from '../types/app.types';

// This is a simplified version - in a real app, you'd use actual audio analysis
export function estimateAudioFeatures(track: TrackMetadata): Partial<TrackMetadata> {
  // Generate consistent pseudorandom values based on track ID
  const hash = simpleHash(track.id + track.name);
  
  // Map artist name to potential genres
  let genre = 'Pop'; // Default genre
  const artistLower = track.artist.toLowerCase();
  
  if (artistLower.includes('rock') || artistLower.includes('metal')) {
    genre = 'Rock';
  } else if (artistLower.includes('hip') || artistLower.includes('rap')) {
    genre = 'Hip Hop';
  } else if (artistLower.includes('jazz')) {
    genre = 'Jazz';
  } else if (artistLower.includes('country')) {
    genre = 'Country';
  } else if (artistLower.includes('electronic') || artistLower.includes('edm')) {
    genre = 'Electronic';
  }
  
  // Estimate language from artist name and track title
  // This is very simplified and not accurate
  const allText = (track.name + ' ' + track.artist).toLowerCase();
  let language = 'English'; // Default
  
  if (/[á-úñ]/.test(allText)) {
    language = 'Spanish';
  } else if (/[à-ù]/.test(allText)) {
    language = 'French';
  } else if (/[ä-üß]/.test(allText)) {
    language = 'German';
  } else if (/[а-я]/.test(allText)) {
    language = 'Russian';
  }

  // Return values that are guaranteed to be defined
  return {
    energy: (hash % 100) / 100,  // Always returns a number between 0-1
    tempo: 70 + (hash % 80),     // Always returns a number between 70-150
    genre,                       // String value
    language                     // String value
  };
}

// Simple string hash function
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}