import { TrackMetadata } from '../types/app.types';

export function groupTracks(
  tracks: TrackMetadata[], 
  criteria: string
): Record<string, TrackMetadata[]> {
  if (!tracks || tracks.length === 0) {
    return {};
  }

  const groups: Record<string, TrackMetadata[]> = {};

  tracks.forEach(track => {
    // Get the grouping value based on the criteria
    let groupValue: string;
    
    switch (criteria) {
      case 'artist':
        groupValue = track.artist || 'Unknown Artist';
        break;
      case 'genre':
        groupValue = track.genre || 'Unknown Genre';
        break;
      case 'language':
        groupValue = track.language || 'Unknown Language';
        break;
      default:
        groupValue = 'Other';
    }

    // Initialize the group if it doesn't exist
    if (!groups[groupValue]) {
      groups[groupValue] = [];
    }

    // Add the track to the appropriate group
    groups[groupValue].push(track);
  });

  return groups;
}