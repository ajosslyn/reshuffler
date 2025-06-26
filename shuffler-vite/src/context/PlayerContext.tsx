import React, { createContext, useState, ReactNode } from 'react';

interface Track {
  id: string;
  name: string;
  preview_url?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
}

export const PlayerContext = createContext<PlayerContextType>({
  currentTrack: null,
  isPlaying: false,
  playTrack: () => {},
  pauseTrack: () => {},
  nextTrack: () => {},
  previousTrack: () => {},
  queue: [],
  addToQueue: () => {},
  clearQueue: () => {}
});

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const playTrack = (track: Track) => {
    if (!track.preview_url) {
      console.warn('No preview URL available for this track');
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(track.preview_url);
    audio.play().then(() => {
      setCurrentTrack(track);
      setIsPlaying(true);
      setAudioElement(audio);
    }).catch(error => {
      console.error('Error playing track:', error);
    });
  };

  const pauseTrack = () => {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  };

  const nextTrack = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      setQueue(newQueue);
      playTrack(nextTrack);
    }
  };

  const previousTrack = () => {
    // This would need track history implementation
    console.log('Previous track functionality not implemented');
  };

  const addToQueue = (track: Track) => {
    setQueue([...queue, track]);
  };

  const clearQueue = () => {
    setQueue([]);
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      playTrack,
      pauseTrack,
      nextTrack,
      previousTrack,
      queue,
      addToQueue,
      clearQueue
    }}>
      {children}
    </PlayerContext.Provider>
  );
};