import { TrackMetadata } from '../types/app.types';

export const estimateAudioFeatures = (track: any) => {
  // Extract genre hints from track name and artist
  const text = (track.name + ' ' + track.artist).toLowerCase();
  
  // Energy estimates (0-1 scale)
  let energy = 0.5; // Default
  
  // Reggaeton, Afrobeats, Amapiano specific detection
  if (text.match(/reggaeton|latin|latino|daddy yankee|j balvin|bad bunny|ozuna|maluma/)) {
    energy = 0.75;
    track.genre = 'Reggaeton/Latin';
    track.language = 'Spanish';
  } else if (text.match(/afrobeats|afro|burna boy|wizkid|davido|tems|africa/)) {
    energy = 0.72;
    track.genre = 'Afrobeats';
  } else if (text.match(/amapiano|piano|mellow|south africa/)) {
    energy = 0.58;
    track.genre = 'Amapiano';
  }
  // General music style detection
  else if (text.match(/rock|metal|edm|dance|party|electro|pop|hit|club|remix|festival/)) {
    energy = 0.85;
    if (!track.genre || track.genre === 'Unknown') {
      if (text.match(/rock|metal|guitar|band/)) {
        track.genre = 'Rock';
      } else if (text.match(/edm|dance|electro|club|remix|dj/)) {
        track.genre = 'Electronic/Dance';
      } else {
        track.genre = 'Pop';
      }
    }
  } else if (text.match(/rap|hip hop|trap|drake|kendrick|future|migos/)) {
    energy = 0.75;
    if (!track.genre || track.genre === 'Unknown') {
      track.genre = 'Hip Hop/Rap';
    }
  } else if (text.match(/r&b|soul|groove|rnb|smooth/)) {
    energy = 0.6;
    if (!track.genre || track.genre === 'Unknown') {
      track.genre = 'R&B/Soul';
    }
  } else if (text.match(/jazz|lounge|chill|acoustic|guitar|indie/)) {
    energy = 0.4;
    if (!track.genre || track.genre === 'Unknown') {
      if (text.match(/jazz|saxophone|trumpet|blues/)) {
        track.genre = 'Jazz';
      } else if (text.match(/indie|folk|acoustic/)) {
        track.genre = 'Indie/Alternative';
      } else {
        track.genre = 'Chill';
      }
    }
  } else if (text.match(/ambient|sleep|classical|piano|meditation|calm|relax/)) {
    energy = 0.2;
    if (!track.genre || track.genre === 'Unknown') {
      if (text.match(/classical|orchestra|symphony|mozart|beethoven/)) {
        track.genre = 'Classical';
      } else {
        track.genre = 'Ambient';
      }
    }
  }
  
  // Language detection if not already set
  if (track.language === 'Unknown') {
    if (text.match(/español|latin|latino|spanish|ñ|á|é|í|ó|ú/)) {
      track.language = 'Spanish';
    } else if (text.match(/français|french|parle|chanson|amour/)) {
      track.language = 'French';
    } else if (text.match(/português|brazil|brasil|brazilian/)) {
      track.language = 'Portuguese';
    } else if (text.match(/korea|kpop|k-pop|한국/)) {
      track.language = 'Korean';
    } else if (text.match(/japan|jpop|j-pop|日本/)) {
      track.language = 'Japanese';
    } else if (text.match(/african|africa|afro|swahili|yoruba/)) {
      track.language = 'African';
    } else {
      track.language = 'English'; // Default assumption
    }
  }
  
  // Tempo estimates (BPM)
  let tempo = 120; // Default
  
  // Genre-based tempo estimation
  if (track.genre === 'Reggaeton/Latin') {
    tempo = 96; // Typical reggaeton tempo
  } else if (track.genre === 'Afrobeats') {
    tempo = 108; // Typical afrobeats tempo
  } else if (track.genre === 'Amapiano') {
    tempo = 115; // Typical amapiano tempo
  } else if (track.genre === 'Hip Hop/Rap') {
    tempo = 95; // Average hip-hop tempo
  } else if (track.genre === 'Electronic/Dance') {
    tempo = 128; // Common EDM tempo
  } else if (track.genre === 'Ambient' || track.genre === 'Classical') {
    tempo = 75; // Slower tempo for ambient/classical
  }
  // Text-based tempo detection
  else if (text.match(/fast|speed|rush|race|quick|rapid/)) {
    tempo = 160;
  } else if (text.match(/dance|beat|groove|party|rhythm|moving/)) {
    tempo = 128;
  } else if (text.match(/slow|ballad|calm|gentle|quiet|soft/)) {
    tempo = 80;
  }
  
  return { 
    energy, 
    tempo,
    genre: track.genre,  // Return updated genre
    language: track.language // Return updated language
  };
};