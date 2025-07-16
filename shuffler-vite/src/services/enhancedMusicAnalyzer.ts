import { Track } from '../types/spotify.types';
import { LastFmService, LastFmTrackInfo, LastFmArtistInfo } from './lastFmService';

export interface EnhancedTrackData {
  track: Track;
  lastFmTrack?: LastFmTrackInfo | null;
  lastFmArtist?: LastFmArtistInfo | null;
  enhancedGenres: string[];
  moodScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  vibeCategories: string[];
  danceability: number;
  popularityScore: number;
}

export class EnhancedMusicAnalyzer {
  private lastFmService: LastFmService;

  constructor(lastFmApiKey: string) {
    this.lastFmService = new LastFmService(lastFmApiKey);
  }

  async analyzeTrack(track: Track): Promise<EnhancedTrackData> {
    try {
      console.log(`🎵 Analyzing: ${track.artist} - ${track.name}`);
      
      // Get data from Last.fm API in parallel
      const [lastFmTrack, lastFmArtist] = await Promise.all([
        this.lastFmService.getTrackInfo(track.artist, track.name),
        this.lastFmService.getArtistInfo(track.artist)
      ]);

      // Combine and enhance the data
      const enhancedGenres = this.extractEnhancedGenres(track, lastFmTrack, lastFmArtist);
      const moodScore = this.calculateMoodScore(track, lastFmTrack, lastFmArtist);
      const energyLevel = this.categorizeEnergy(track.tempo, lastFmTrack, lastFmArtist);
      const vibeCategories = this.extractVibeCategories(track, lastFmTrack, lastFmArtist);
      const danceability = this.calculateDanceability(track, lastFmTrack);
      const popularityScore = this.calculatePopularityScore(lastFmTrack, lastFmArtist);

      return {
        track,
        lastFmTrack,
        lastFmArtist,
        enhancedGenres,
        moodScore,
        energyLevel,
        vibeCategories,
        danceability,
        popularityScore
      };
    } catch (error) {
      console.error('Error analyzing track:', error);
      
      // Return basic analysis if enhanced fails
      return {
        track,
        lastFmTrack: null,
        lastFmArtist: null,
        enhancedGenres: [track.genre].filter(Boolean),
        moodScore: 0.5,
        energyLevel: this.categorizeEnergy(track.tempo),
        vibeCategories: ['unknown'],
        danceability: 0.5,
        popularityScore: 0.5
      };
    }
  }

  private extractEnhancedGenres(track: Track, trackInfo?: LastFmTrackInfo | null, artistInfo?: LastFmArtistInfo | null): string[] {
    const genres = new Set<string>();

    // Add original genre
    if (track.genre && track.genre !== 'Unknown') {
      genres.add(track.genre.toLowerCase());
    }

    // Add track tags from Last.fm (null-safe)
    if (trackInfo?.tags) {
      trackInfo.tags.forEach(tag => {
        if (this.isGenreTag(tag.name)) {
          genres.add(tag.name.toLowerCase());
        }
      });
    }

    // Add artist tags from Last.fm (null-safe)
    if (artistInfo?.tags) {
      artistInfo.tags.forEach(tag => {
        if (this.isGenreTag(tag.name)) {
          genres.add(tag.name.toLowerCase());
        }
      });
    }

    return Array.from(genres);
  }

  private isGenreTag(tag: string): boolean {
    const genreKeywords = [
      'rock', 'pop', 'jazz', 'blues', 'classical', 'electronic', 'hip hop', 'hip-hop', 'rap',
      'country', 'folk', 'reggae', 'metal', 'punk', 'alternative', 'indie', 'grunge',
      'soul', 'funk', 'disco', 'house', 'techno', 'ambient', 'experimental', 'trance',
      'world music', 'latin', 'gospel', 'r&b', 'rnb', 'dance', 'drum and bass', 'dubstep',
      'singer-songwriter', 'acoustic', 'instrumental', 'orchestral', 'new wave', 'synthpop'
    ];

    const tagLower = tag.toLowerCase();
    return genreKeywords.some(genre => 
      tagLower.includes(genre) || genre.includes(tagLower)
    );
  }

  private calculateMoodScore(track: Track, trackInfo?: LastFmTrackInfo | null, artistInfo?: LastFmArtistInfo | null): number {
    let moodScore = 0.5; // Default neutral mood

    // Base score from tempo (faster = more energetic/happy)
    if (track.tempo > 120) moodScore += 0.2;
    if (track.tempo > 140) moodScore += 0.1;
    if (track.tempo < 80) moodScore -= 0.1;
    if (track.tempo < 60) moodScore -= 0.2;

    // Adjust based on Last.fm tags (null-safe)
    const allTags = [
      ...(trackInfo?.tags || []),
      ...(artistInfo?.tags || [])
    ];

    let tagModifier = 0;
    allTags.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      
      // Positive mood tags
      if (['happy', 'upbeat', 'energetic', 'joyful', 'cheerful', 'uplifting', 'positive', 'fun'].includes(tagName)) {
        tagModifier += 0.15;
      }
      
      // Negative mood tags
      if (['sad', 'melancholy', 'dark', 'depressing', 'somber', 'mournful', 'tragic'].includes(tagName)) {
        tagModifier -= 0.15;
      }
      
      // Calm/peaceful tags
      if (['chill', 'relaxing', 'peaceful', 'calm', 'ambient', 'meditation'].includes(tagName)) {
        tagModifier += 0.05;
      }

      // Party/dance tags
      if (['party', 'dance', 'club', 'celebration'].includes(tagName)) {
        tagModifier += 0.1;
      }
    });

    return Math.max(0, Math.min(1, moodScore + tagModifier));
  }

  private categorizeEnergy(tempo: number, trackInfo?: LastFmTrackInfo | null, artistInfo?: LastFmArtistInfo | null): 'low' | 'medium' | 'high' {
    let energyScore = 0;

    // Base energy from tempo
    if (tempo < 70) energyScore = 1;
    else if (tempo < 100) energyScore = 2;
    else if (tempo < 130) energyScore = 3;
    else energyScore = 4;

    // Adjust based on tags (null-safe)
    const allTags = [
      ...(trackInfo?.tags || []), 
      ...(artistInfo?.tags || [])
    ];
    
    allTags.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      
      if (['energetic', 'high energy', 'aggressive', 'intense'].includes(tagName)) {
        energyScore += 1;
      }
      
      if (['calm', 'chill', 'relaxing', 'ambient', 'slow'].includes(tagName)) {
        energyScore -= 1;
      }
    });

    if (energyScore <= 2) return 'low';
    if (energyScore <= 4) return 'medium';
    return 'high';
  }

  private extractVibeCategories(track: Track, trackInfo?: LastFmTrackInfo | null, artistInfo?: LastFmArtistInfo | null): string[] {
    const vibes = new Set<string>();

    // Tempo-based vibes
    if (track.tempo > 130) vibes.add('fast-paced');
    if (track.tempo < 80) vibes.add('slow');
    if (track.tempo >= 120 && track.tempo <= 140) vibes.add('danceable');

    // Last.fm tag-based vibes (null-safe)
    const allTags = [
      ...(trackInfo?.tags || []), 
      ...(artistInfo?.tags || [])
    ];

    allTags.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      
      // Activity vibes
      if (['chill', 'relaxing', 'ambient', 'meditation'].includes(tagName)) vibes.add('chill');
      if (['party', 'dance', 'club', 'rave'].includes(tagName)) vibes.add('party');
      if (['workout', 'running', 'gym', 'fitness'].includes(tagName)) vibes.add('workout');
      if (['romantic', 'love', 'sensual', 'intimate'].includes(tagName)) vibes.add('romantic');
      if (['study', 'focus', 'concentration', 'work'].includes(tagName)) vibes.add('focus');
      if (['nostalgic', 'retro', 'vintage', 'oldies'].includes(tagName)) vibes.add('nostalgic');
      if (['driving', 'road trip', 'car'].includes(tagName)) vibes.add('driving');
      if (['summer', 'beach', 'vacation'].includes(tagName)) vibes.add('summer');
      if (['night', 'evening', 'late night'].includes(tagName)) vibes.add('night');
      if (['morning', 'wake up', 'coffee'].includes(tagName)) vibes.add('morning');
      
      // Mood vibes
      if (['happy', 'joyful', 'cheerful', 'uplifting'].includes(tagName)) vibes.add('uplifting');
      if (['emotional', 'deep', 'meaningful'].includes(tagName)) vibes.add('emotional');
      if (['aggressive', 'angry', 'hardcore'].includes(tagName)) vibes.add('aggressive');
    });

    // If no specific vibes found, add a general one
    if (vibes.size === 0) {
      vibes.add('general');
    }

    return Array.from(vibes);
  }

  private calculateDanceability(track: Track, trackInfo?: LastFmTrackInfo | null): number {
    let danceability = 0.5;

    // Tempo-based danceability
    if (track.tempo >= 120 && track.tempo <= 140) danceability += 0.3;
    if (track.tempo >= 100 && track.tempo < 120) danceability += 0.1;
    if (track.tempo > 140) danceability += 0.2;

    // Tag-based danceability (null-safe)
    if (trackInfo?.tags) {
      trackInfo.tags.forEach(tag => {
        const tagName = tag.name.toLowerCase();
        if (['dance', 'danceable', 'club', 'party', 'disco', 'house', 'techno'].includes(tagName)) {
          danceability += 0.2;
        }
      });
    }

    return Math.max(0, Math.min(1, danceability));
  }

  private calculatePopularityScore(trackInfo?: LastFmTrackInfo | null, artistInfo?: LastFmArtistInfo | null): number {
    let popularity = 0.5;

    // More tags usually means more popular/well-known (null-safe)
    const totalTags = (trackInfo?.tags?.length || 0) + (artistInfo?.tags?.length || 0);
    popularity += Math.min(0.3, totalTags * 0.02);

    // Check for mainstream indicators (null-safe)
    const allTags = [
      ...(trackInfo?.tags || []), 
      ...(artistInfo?.tags || [])
    ];
    
    allTags.forEach(tag => {
      const tagName = tag.name.toLowerCase();
      if (['mainstream', 'popular', 'hit', 'chart', 'radio'].includes(tagName)) {
        popularity += 0.2;
      }
      if (['underground', 'experimental', 'avant-garde'].includes(tagName)) {
        popularity -= 0.1;
      }
    });

    return Math.max(0, Math.min(1, popularity));
  }

  async analyzeTracks(tracks: Track[]): Promise<EnhancedTrackData[]> {
    console.log(`🚀 Starting analysis of ${tracks.length} tracks...`);
    const results: EnhancedTrackData[] = [];
    
    // Process in smaller batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tracks.length/batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(track => this.analyzeTrack(track))
      );
      
      results.push(...batchResults);
      
      // Progress logging
      console.log(`✅ Processed ${Math.min(i + batchSize, tracks.length)}/${tracks.length} tracks`);
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log(`🎉 Analysis complete! Enhanced ${results.length} tracks`);
    return results;
  }

  // Get cache statistics
  getCacheStats() {
    return this.lastFmService.getCacheStats();
  }

  // Clear cache if needed
  clearCache() {
    this.lastFmService.clearCache();
  }
}

// Factory function
export const createEnhancedMusicAnalyzer = (lastFmApiKey: string): EnhancedMusicAnalyzer => {
  return new EnhancedMusicAnalyzer(lastFmApiKey);
};

export default EnhancedMusicAnalyzer;