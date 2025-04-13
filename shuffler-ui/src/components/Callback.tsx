import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Callback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');

    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      if (expiresIn) {
        const expirationTime = Date.now() + parseInt(expiresIn) * 1000;
        localStorage.setItem('tokenExpiration', expirationTime.toString());
      }
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [navigate, location]);

  return <div>Authenticating with Spotify...</div>;
};

export default Callback;