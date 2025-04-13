import { useEffect, useState } from 'react';

const useSpotifyAuth = () => {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        let token = window.localStorage.getItem('spotify_access_token');

        if (!token && hash) {
            const params = new URLSearchParams(hash.replace('#', '?'));
            token = params.get('access_token');
            if (token) {
                window.localStorage.setItem('spotify_access_token', token);
                window.location.hash = '';
            } else {
                setError('Authentication failed');
            }
        }

        setAccessToken(token);
    }, []);

    const logout = () => {
        setAccessToken(null);
        window.localStorage.removeItem('spotify_access_token');
    };

    return { accessToken, error, logout };
};

export default useSpotifyAuth;