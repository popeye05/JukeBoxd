/**
 * JWT Token Management Utilities
 * Handles token storage, validation, and expiration checking
 */

const TOKEN_KEY = 'authToken';

export interface TokenPayload {
  userId: string;
  username: string;
  exp: number;
  iat: number;
}

/**
 * Store JWT token in localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieve JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Decode JWT token payload without verification
 * Note: This is for client-side convenience only, server must verify
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as TokenPayload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Check if token is valid (exists and not expired)
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) {
    return false;
  }

  return !isTokenExpired(token);
};

/**
 * Get time until token expires (in seconds)
 */
export const getTokenTimeToExpiry = (token: string): number => {
  const payload = decodeToken(token);
  if (!payload) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
};

/**
 * Auto-refresh token before expiration
 * Returns true if refresh is needed (token expires within threshold)
 */
export const shouldRefreshToken = (token: string, thresholdMinutes: number = 5): boolean => {
  const timeToExpiry = getTokenTimeToExpiry(token);
  const thresholdSeconds = thresholdMinutes * 60;
  
  return timeToExpiry > 0 && timeToExpiry < thresholdSeconds;
};