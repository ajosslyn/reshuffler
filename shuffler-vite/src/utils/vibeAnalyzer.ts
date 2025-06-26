import { TrackMetadata } from '../types/app.types';

export function groupTracksByVibe(tracks: TrackMetadata[]): Record<string, TrackMetadata[]> {
  if (!tracks || tracks.length === 0) {
    return {};
  }

  const groups: Record<string, TrackMetadata[]> = {
    'Energetic': [],
    'Chill': [],
    'Upbeat': [],
    'Mellow': [],
    'Other': []
  };

  tracks.forEach(track => {
    // Use energy and tempo to determine vibe
    const { energy, tempo } = track;
    
    if (energy > 0.7 && tempo > 120) {
      groups['Energetic'].push(track);
    } else if (energy < 0.4 && tempo < 110) {
      groups['Chill'].push(track);
    } else if (energy > 0.5 && tempo > 100 && tempo < 130) {
      groups['Upbeat'].push(track);
    } else if (energy < 0.6 && tempo >= 110 && tempo <= 120) {
      groups['Mellow'].push(track);
    } else {
      groups['Other'].push(track);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}