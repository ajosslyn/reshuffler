import React, { useContext, useEffect, useState } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import useTrackMetadata from '../hooks/useTrackMetadata';

const Player: React.FC = () => {
    const { currentTrack, isPlaying, playTrack, pauseTrack } = useContext(PlayerContext);


    const trackId = currentTrack?.id || '';
    const metadata = useTrackMetadata(trackId);

    useEffect(() => {
        if (metadata) {
            setTrackMetadata(metadata);
        }
    }, [metadata]);
    
    const [trackMetadata, setTrackMetadata] = useState<any>(null);

    const handlePlayPause = () => {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack(currentTrack);
        }
    };

    return (
        <div className="player">
            {trackMetadata && (
                <>
                    <h2>{trackMetadata.title}</h2>
                    <h3>{trackMetadata.artist}</h3>
                    <button onClick={handlePlayPause}>
                        {isPlaying ? 'Pause' : 'Play'}
                    </button>
                </>
            )}
        </div>
    );
};

export default Player;