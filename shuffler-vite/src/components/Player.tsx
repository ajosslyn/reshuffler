import React, { useContext, useEffect, useState } from 'react';
import useTrackMetadata from '../hooks/useTrackMetadata';
import { PlayerContext } from '../context/PlayerContext';


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
        } else if (currentTrack) {  // Add this null check
            playTrack(currentTrack);
        }
    };

    return (
        <div className="player">
            {trackMetadata && (
                <>
                    <h2>{trackMetadata.title}</h2>
                    <h3>{trackMetadata.artist}</h3>
                    <button 
    onClick={handlePlayPause}
    disabled={!currentTrack}
    className={!currentTrack ? "button-disabled" : ""}
>
    {isPlaying ? 'Pause' : 'Play'}
</button>
                </>
            )}
        </div>
    );
};

export default Player;