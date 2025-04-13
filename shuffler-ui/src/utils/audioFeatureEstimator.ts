export const estimateAudioFeatures = (track: any) => {
  // Extract genre hints from track name and artist
  const text = (track.name + ' ' + track.artist).toLowerCase();
  
  // Energy estimates (0-1 scale)
  let energy = 0.5; // Default
  if (text.match(/rock|metal|edm|dance|party|electro|pop|hit/)) {
    energy = 0.8;
  } else if (text.match(/rap|hip hop|trap|reggaeton|afrobeats/)) {
    energy = 0.7;
  } else if (text.match(/r&b|soul|groove/)) {
    energy = 0.6;
  } else if (text.match(/jazz|lounge|chill|acoustic/)) {
    energy = 0.4;
  } else if (text.match(/ambient|sleep|classical|piano|meditation/)) {
    energy = 0.2;
  }
  
  // Tempo estimates (BPM)
  let tempo = 120; // Default
  if (text.match(/fast|speed|rush|race/)) {
    tempo = 160;
  } else if (text.match(/dance|beat|groove|party/)) {
    tempo = 128;
  } else if (text.match(/slow|ballad|calm/)) {
    tempo = 80;
  }
  
  return { energy, tempo };
};