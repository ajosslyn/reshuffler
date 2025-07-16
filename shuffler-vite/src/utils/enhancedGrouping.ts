import { EnhancedTrackData } from '../services/enhancedMusicAnalyzer';

export interface EnhancedGroupedTracks {
  [groupName: string]: EnhancedTrackData[];
}

export class AdvancedPlaylistGrouper {
  createIntelligentGroups(enhancedTracks: EnhancedTrackData[]): EnhancedGroupedTracks {
    console.log(`🎨 Creating intelligent groups from ${enhancedTracks.length} enhanced tracks...`);
    
    const groups: EnhancedGroupedTracks = {};

    // Energy-based groups
    groups['🔥 High Energy'] = enhancedTracks.filter(t => t.energyLevel === 'high');
    groups['😌 Chill Vibes'] = enhancedTracks.filter(t => 
      t.energyLevel === 'low' || t.vibeCategories.includes('chill')
    );
    groups['⚡ Medium Energy'] = enhancedTracks.filter(t => t.energyLevel === 'medium');
    
    // Mood-based groups
    groups['😊 Feel Good Hits'] = enhancedTracks.filter(t => t.moodScore > 0.7);
    groups['😢 Emotional Journey'] = enhancedTracks.filter(t => t.moodScore < 0.3);
    groups['🎭 Balanced Mood'] = enhancedTracks.filter(t => 
      t.moodScore >= 0.3 && t.moodScore <= 0.7
    );
    
    // Activity-based groups
    groups['💃 Dance Party'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('party') || 
      t.vibeCategories.includes('danceable') || 
      t.danceability > 0.7
    );
    groups['🏃 Workout Mix'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('workout') || 
      (t.energyLevel === 'high' && t.track.tempo > 120)
    );
    groups['📚 Focus & Study'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('focus') || 
      t.vibeCategories.includes('chill')
    );
    groups['💕 Romantic Mood'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('romantic')
    );
    groups['🚗 Road Trip'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('driving') || 
      (t.energyLevel === 'medium' && t.moodScore > 0.5)
    );
    
    // Time-based groups
    groups['🌅 Morning Boost'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('morning') || 
      (t.moodScore > 0.6 && t.energyLevel !== 'low')
    );
    groups['🌙 Night Vibes'] = enhancedTracks.filter(t => 
      t.vibeCategories.includes('night') || 
      (t.energyLevel === 'low' && t.vibeCategories.includes('chill'))
    );
    
    // Enhanced genre groups
    const genreGroups = this.createEnhancedGenreGroups(enhancedTracks);
    Object.assign(groups, genreGroups);
    
    // Decade groups
    const decadeGroups = this.createDecadeGroups(enhancedTracks);
    Object.assign(groups, decadeGroups);
    
    // Popularity groups
    groups['🔥 Mainstream Hits'] = enhancedTracks.filter(t => t.popularityScore > 0.7);
    groups['💎 Hidden Gems'] = enhancedTracks.filter(t => t.popularityScore < 0.4);
    
    // Tempo-based groups
    groups['🏃‍♂️ Fast Paced'] = enhancedTracks.filter(t => t.track.tempo > 140);
    groups['🐌 Slow & Steady'] = enhancedTracks.filter(t => t.track.tempo < 80);
    
    // Remove empty groups and sort by size
    const filteredGroups = Object.fromEntries(
      Object.entries(groups)
        .filter(([_, tracks]) => tracks.length > 0)
        .sort(([, a], [, b]) => b.length - a.length)
    );
    
    console.log(`✨ Created ${Object.keys(filteredGroups).length} groups`);
    return filteredGroups;
  }

  private createEnhancedGenreGroups(tracks: EnhancedTrackData[]): EnhancedGroupedTracks {
    const genreGroups: EnhancedGroupedTracks = {};
    
    // Collect all enhanced genres
    const genreCounts = new Map<string, EnhancedTrackData[]>();
    
    tracks.forEach(track => {
      track.enhancedGenres.forEach(genre => {
        if (!genreCounts.has(genre)) {
          genreCounts.set(genre, []);
        }
        genreCounts.get(genre)!.push(track);
      });
    });
    
    // Create groups for genres with enough tracks
    genreCounts.forEach((genreTracks, genre) => {
      if (genreTracks.length >= 2) { // Lower threshold since we have enhanced data
        genreGroups[`🎵 ${this.capitalizeGenre(genre)}`] = genreTracks;
      }
    });
    
    return genreGroups;
  }

  private createDecadeGroups(tracks: EnhancedTrackData[]): EnhancedGroupedTracks {
    const decadeGroups: EnhancedGroupedTracks = {};
    
    tracks.forEach(track => {
      // Try to extract year from track data or guess from style
      const decade = this.guessDecadeFromGenreAndStyle(track);
      if (decade) {
        const decadeName = `📅 ${decade}`;
        if (!decadeGroups[decadeName]) {
          decadeGroups[decadeName] = [];
        }
        decadeGroups[decadeName].push(track);
      }
    });
    
    return decadeGroups;
  }

  private guessDecadeFromGenreAndStyle(track: EnhancedTrackData): string | null {
    const tags = [
      ...(track.lastFmTrack?.tags || []), 
      ...(track.lastFmArtist?.tags || [])
    ];
    
    // Check for era-specific tags
    for (const tag of tags) {
      const tagName = tag.name.toLowerCase();
      if (tagName.includes('60s') || tagName.includes('1960')) return '1960s';
      if (tagName.includes('70s') || tagName.includes('1970')) return '1970s';
      if (tagName.includes('80s') || tagName.includes('1980')) return '1980s';
      if (tagName.includes('90s') || tagName.includes('1990')) return '1990s';
      if (tagName.includes('2000s') || tagName.includes('00s')) return '2000s';
      if (tagName.includes('2010s') || tagName.includes('10s')) return '2010s';
      if (tagName.includes('2020s') || tagName.includes('20s')) return '2020s';
    }
    
    // Guess based on genre patterns
    const genres = track.enhancedGenres;
    if (genres.some(g => ['disco', 'funk', 'classic rock'].includes(g))) return '1970s';
    if (genres.some(g => ['new wave', 'synthpop', 'hair metal'].includes(g))) return '1980s';
    if (genres.some(g => ['grunge', 'alternative rock', 'britpop'].includes(g))) return '1990s';
    if (genres.some(g => ['nu metal', 'emo', 'garage rock'].includes(g))) return '2000s';
    if (genres.some(g => ['indie pop', 'dubstep', 'trap'].includes(g))) return '2010s';
    
    return null; // Can't determine decade
  }

  private capitalizeGenre(genre: string): string {
    return genre.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Additional utility methods for more specific grouping
  createCustomGroups(tracks: EnhancedTrackData[], customCriteria: string): EnhancedGroupedTracks {
    const groups: EnhancedGroupedTracks = {};
    
    switch (customCriteria) {
      case 'vibe-only':
        tracks.forEach(track => {
          track.vibeCategories.forEach(vibe => {
            const groupName = `${this.getVibeEmoji(vibe)} ${this.capitalizeGenre(vibe)}`;
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(track);
          });
        });
        break;
        
      case 'energy-mood-matrix':
        tracks.forEach(track => {
          const energyMood = `${this.getEnergyEmoji(track.energyLevel)} ${track.energyLevel} Energy + ${this.getMoodEmoji(track.moodScore)} ${this.getMoodLabel(track.moodScore)}`;
          if (!groups[energyMood]) groups[energyMood] = [];
          groups[energyMood].push(track);
        });
        break;
        
      default:
        return this.createIntelligentGroups(tracks);
    }
    
    return Object.fromEntries(
      Object.entries(groups).filter(([_, tracks]) => tracks.length > 0)
    );
  }

  private getVibeEmoji(vibe: string): string {
    const emojiMap: Record<string, string> = {
      'chill': '😌',
      'party': '💃',
      'workout': '🏃',
      'romantic': '💕',
      'focus': '📚',
      'driving': '🚗',
      'nostalgic': '📼',
      'summer': '☀️',
      'night': '🌙',
      'morning': '🌅',
      'uplifting': '😊',
      'emotional': '🎭',
      'aggressive': '😤'
    };
    return emojiMap[vibe] || '🎵';
  }

  private getEnergyEmoji(energy: string): string {
    switch (energy) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '😌';
      default: return '🎵';
    }
  }

  private getMoodEmoji(moodScore: number): string {
    if (moodScore > 0.7) return '😊';
    if (moodScore < 0.3) return '😢';
    return '😐';
  }

  private getMoodLabel(moodScore: number): string {
    if (moodScore > 0.7) return 'Happy';
    if (moodScore < 0.3) return 'Sad';
    return 'Neutral';
  }

  // Create cross-playlist groups based on combined data
  createCrossPlaylistGroups(enhancedTracks: EnhancedTrackData[]): EnhancedGroupedTracks {
    console.log(`🎯 Creating cross-playlist groups from ${enhancedTracks.length} tracks...`);
    
    const groups: EnhancedGroupedTracks = {};

    // First, create traditional intelligent groups
    const intelligentGroups = this.createIntelligentGroups(enhancedTracks);
    
    // Then, create playlist-aware groups
    const playlistMap = new Map<string, EnhancedTrackData[]>();
    
    // Group tracks by playlist
    enhancedTracks.forEach(track => {
      const playlistName = track.track.playlistName || 'Unknown Playlist';
      if (!playlistMap.has(playlistName)) {
        playlistMap.set(playlistName, []);
      }
      playlistMap.get(playlistName)!.push(track);
    });
    
    // Create hybrid groups combining playlist and characteristic data
    playlistMap.forEach((tracks, playlistName) => {
      if (tracks.length >= 3) { // Only create groups with meaningful size
        // High energy tracks from this playlist
        const highEnergyTracks = tracks.filter(t => t.energyLevel === 'high');
        if (highEnergyTracks.length >= 2) {
          groups[`🔥 ${playlistName} - High Energy`] = highEnergyTracks;
        }
        
        // Chill tracks from this playlist
        const chillTracks = tracks.filter(t => t.energyLevel === 'low' || t.vibeCategories.includes('chill'));
        if (chillTracks.length >= 2) {
          groups[`😌 ${playlistName} - Chill`] = chillTracks;
        }
        
        // Top tracks from this playlist (based on popularity)
        const topTracks = tracks
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, Math.min(10, Math.floor(tracks.length * 0.4)));
        if (topTracks.length >= 2) {
          groups[`⭐ ${playlistName} - Top Picks`] = topTracks;
        }
      }
    });
    
    // Merge with intelligent groups, prioritizing cross-playlist groups
    return { ...intelligentGroups, ...groups };
  }
}

export const createAdvancedPlaylistGrouper = (): AdvancedPlaylistGrouper => {
  return new AdvancedPlaylistGrouper();
};

export default AdvancedPlaylistGrouper;