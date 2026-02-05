import {
  setToken,
  getToken,
  removeToken,
  decodeToken,
  isTokenExpired,
  isTokenValid,
  getTokenTimeToExpiry,
  shouldRefreshToken,
} from './tokenManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('tokenManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('setToken', () => {
    it('stores token in localStorage', () => {
      const token = 'test-token';
      setToken(token);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', token);
    });
  });

  describe('getToken', () => {
    it('retrieves token from localStorage', () => {
      const token = 'test-token';
      localStorageMock.getItem.mockReturnValue(token);
      
      const result = getToken();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('authToken');
      expect(result).toBe(token);
    });

    it('returns null when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getToken();
      
      expect(result).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('removes token from localStorage', () => {
      removeToken();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('decodeToken', () => {
    it('decodes valid JWT token', () => {
      // Create a mock JWT token (header.payload.signature)
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = decodeToken(token);
      
      expect(result).toEqual(payload);
    });

    it('returns null for invalid token format', () => {
      const invalidToken = 'invalid-token';
      
      const result = decodeToken(invalidToken);
      
      expect(result).toBeNull();
    });

    it('returns null for malformed JSON in payload', () => {
      const invalidPayload = btoa('invalid-json');
      const token = `header.${invalidPayload}.signature`;
      
      const result = decodeToken(token);
      
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for non-expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = isTokenExpired(token);
      
      expect(result).toBe(false);
    });

    it('returns true for expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = isTokenExpired(token);
      
      expect(result).toBe(true);
    });

    it('returns true for invalid token', () => {
      const result = isTokenExpired('invalid-token');
      
      expect(result).toBe(true);
    });
  });

  describe('isTokenValid', () => {
    it('returns false when no token exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = isTokenValid();
      
      expect(result).toBe(false);
    });

    it('returns false for expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const result = isTokenValid();
      
      expect(result).toBe(false);
    });

    it('returns true for valid non-expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      localStorageMock.getItem.mockReturnValue(token);
      
      const result = isTokenValid();
      
      expect(result).toBe(true);
    });
  });

  describe('getTokenTimeToExpiry', () => {
    it('returns correct time to expiry for valid token', () => {
      const expiryTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: expiryTime,
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = getTokenTimeToExpiry(token);
      
      // Should be approximately 3600 seconds (allowing for small timing differences)
      expect(result).toBeGreaterThan(3590);
      expect(result).toBeLessThanOrEqual(3600);
    });

    it('returns 0 for expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = getTokenTimeToExpiry(token);
      
      expect(result).toBe(0);
    });

    it('returns 0 for invalid token', () => {
      const result = getTokenTimeToExpiry('invalid-token');
      
      expect(result).toBe(0);
    });
  });

  describe('shouldRefreshToken', () => {
    it('returns true when token expires within threshold', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 240, // 4 minutes from now
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = shouldRefreshToken(token, 5); // 5 minute threshold
      
      expect(result).toBe(true);
    });

    it('returns false when token expires beyond threshold', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes from now
        iat: Math.floor(Date.now() / 1000),
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = shouldRefreshToken(token, 5); // 5 minute threshold
      
      expect(result).toBe(false);
    });

    it('returns false for expired token', () => {
      const payload = {
        userId: '123',
        username: 'testuser',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        iat: Math.floor(Date.now() / 1000) - 7200,
      };
      
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;
      
      const result = shouldRefreshToken(token);
      
      expect(result).toBe(false);
    });
  });
});