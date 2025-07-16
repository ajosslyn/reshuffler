export interface LastFmTrackInfo {
  name: string;
  artist: string;
  album?: string;
  tags: LastFmTag[];
  wiki?: {
    summary: string;
    content: string;
  };
  similar?: LastFmSimilarTrack[];
}

export interface LastFmTag {
  name: string;
  count: number;
  url: string;
}

export interface LastFmSimilarTrack {
  name: string;
  artist: string;
  match: number;
}

export interface LastFmArtistInfo {
  name: string;
  tags: LastFmTag[];
  similar: LastFmSimilarArtist[];
  bio?: {
    summary: string;
    content: string;
  };
}

export interface LastFmSimilarArtist {
  name: string;
  match: number;
}

export class LastFmService {
  private apiKey: string;
  private baseUrl = 'https://ws.audioscrobbler.com/2.0/';
  private cache = new Map<string, any>();
  private rateLimitDelay = 200; // ms between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTrackInfo(artist: string, track: string): Promise<LastFmTrackInfo | null> {
    const cacheKey = `track_${this.sanitizeString(artist)}_${this.sanitizeString(track)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Rate limiting
    await this.delay(this.rateLimitDelay);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('method', 'track.getInfo');
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('artist', artist);
      url.searchParams.append('track', track);
      url.searchParams.append('format', 'json');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Last.fm API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Last.fm track not found: ${artist} - ${track} (Error: ${data.message})`);
        this.cache.set(cacheKey, null); // Cache null results to avoid repeated requests
        return null;
      }

      const trackInfo: LastFmTrackInfo = {
        name: data.track?.name || track,
        artist: data.track?.artist?.name || artist,
        album: data.track?.album?.title,
        tags: this.parseTags(data.track?.toptags?.tag),
        wiki: data.track?.wiki ? {
          summary: this.cleanWikiText(data.track.wiki.summary),
          content: this.cleanWikiText(data.track.wiki.content)
        } : undefined,
        similar: this.parseSimilarTracks(data.track?.similar?.track)
      };

      this.cache.set(cacheKey, trackInfo);
      return trackInfo;
    } catch (error) {
      console.error('Error fetching Last.fm track info:', error);
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  async getArtistInfo(artist: string): Promise<LastFmArtistInfo | null> {
    const cacheKey = `artist_${this.sanitizeString(artist)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Rate limiting
    await this.delay(this.rateLimitDelay);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('method', 'artist.getInfo');
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('artist', artist);
      url.searchParams.append('format', 'json');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Last.fm API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Last.fm artist not found: ${artist} (Error: ${data.message})`);
        this.cache.set(cacheKey, null);
        return null;
      }

      const artistInfo: LastFmArtistInfo = {
        name: data.artist?.name || artist,
        tags: this.parseTags(data.artist?.tags?.tag),
        similar: this.parseSimilarArtists(data.artist?.similar?.artist),
        bio: data.artist?.bio ? {
          summary: this.cleanWikiText(data.artist.bio.summary),
          content: this.cleanWikiText(data.artist.bio.content)
        } : undefined
      };

      this.cache.set(cacheKey, artistInfo);
      return artistInfo;
    } catch (error) {
      console.error('Error fetching Last.fm artist info:', error);
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  async getTopTracks(artist: string, limit: number = 10): Promise<string[]> {
    const cacheKey = `toptracks_${this.sanitizeString(artist)}_${limit}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Rate limiting
    await this.delay(this.rateLimitDelay);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('method', 'artist.getTopTracks');
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('artist', artist);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('format', 'json');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Last.fm API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Last.fm top tracks not found for: ${artist}`);
        return [];
      }

      const topTracks = data.toptracks?.track?.map((track: any) => track.name) || [];
      this.cache.set(cacheKey, topTracks);
      return topTracks;
    } catch (error) {
      console.error('Error fetching top tracks:', error);
      return [];
    }
  }

  async getSimilarTracks(artist: string, track: string, limit: number = 10): Promise<LastFmSimilarTrack[]> {
    const cacheKey = `similar_${this.sanitizeString(artist)}_${this.sanitizeString(track)}_${limit}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Rate limiting
    await this.delay(this.rateLimitDelay);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('method', 'track.getSimilar');
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('artist', artist);
      url.searchParams.append('track', track);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('format', 'json');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Last.fm API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        console.warn(`Last.fm similar tracks not found for: ${artist} - ${track}`);
        return [];
      }

      const similarTracks = this.parseSimilarTracks(data.similartracks?.track);
      this.cache.set(cacheKey, similarTracks);
      return similarTracks;
    } catch (error) {
      console.error('Error fetching similar tracks:', error);
      return [];
    }
  }

  // Utility methods
  private parseTags(tags: any): LastFmTag[] {
    if (!tags) return [];
    
    // Handle both single tag and array of tags
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    return tagArray.map((tag: any) => ({
      name: tag.name || '',
      count: parseInt(tag.count) || 0,
      url: tag.url || ''
    })).filter(tag => tag.name); // Remove empty tags
  }

  private parseSimilarTracks(tracks: any): LastFmSimilarTrack[] {
    if (!tracks) return [];
    
    const trackArray = Array.isArray(tracks) ? tracks : [tracks];
    
    return trackArray.map((track: any) => ({
      name: track.name || '',
      artist: track.artist?.name || track.artist || '',
      match: parseFloat(track.match) || 0
    })).filter(track => track.name && track.artist);
  }

  private parseSimilarArtists(artists: any): LastFmSimilarArtist[] {
    if (!artists) return [];
    
    const artistArray = Array.isArray(artists) ? artists : [artists];
    
    return artistArray.map((artist: any) => ({
      name: artist.name || '',
      match: parseFloat(artist.match) || 0
    })).filter(artist => artist.name);
  }

  private cleanWikiText(text: string): string {
    if (!text) return '';
    
    // Remove Last.fm specific markup and links
    return text
      .replace(/<a[^>]*>.*?<\/a>/g, '') // Remove links
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private sanitizeString(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management
  getCacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Batch processing for multiple tracks
  async batchAnalyzeTracks(tracks: { artist: string; name: string }[], batchSize: number = 5): Promise<Map<string, LastFmTrackInfo | null>> {
    const results = new Map<string, LastFmTrackInfo | null>();
    
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (track) => {
        const key = `${track.artist}_${track.name}`;
        const result = await this.getTrackInfo(track.artist, track.name);
        return { key, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ key, result }) => {
        results.set(key, result);
      });
      
      // Progress logging
      console.log(`Processed ${Math.min(i + batchSize, tracks.length)}/${tracks.length} tracks`);
    }
    
    return results;
  }
}

// Factory function for easy instantiation
export const createLastFmService = (apiKey: string): LastFmService => {
  return new LastFmService(apiKey);
};

// Default export
export default LastFmService;