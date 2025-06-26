// Add/update your auth.ts file to include the missing logout function

export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await fetch(`/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    localStorage.setItem('expiresAt', (Date.now() + data.expiresIn * 1000).toString());
    
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

// Add this missing logout function
export const logout = () => {
  // Clear all authentication data from localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('expiresAt');
  
  // Redirect to login page
  window.location.href = '/login';
};

export const exchangeCodeForToken = async (code: string) => {
  try {
    const response = await fetch(`/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} - ${await response.text()}`);
    }
    
    const data = await response.json();
    
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresAt', (Date.now() + data.expiresIn * 1000).toString());
    
    return true;
  } catch (error) {
    console.error('Token exchange error:', error);
    return false;
  }
};