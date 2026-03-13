import axios from 'axios';
import { getToken, removeToken } from '../utils/tokenManager';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production'
      ? '/api'  // In production, API is served from same domain
      : 'http://localhost:3001/api'  // In development, backend runs on port 3001
  ),
  timeout: 20000, // Reduced to 20 seconds for faster feedback
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors with retry logic
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= MAX_RETRIES) {
        console.log(`Retrying request (${originalRequest._retryCount}/${MAX_RETRIES})...`);
        await delay(RETRY_DELAY * originalRequest._retryCount);
        return api(originalRequest);
      }

      error.code = 'NETWORK_ERROR';
      error.message = 'Network error. Please check your connection and try again.';
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      // Don't redirect to auth for public endpoints (profile viewing)
      const url = error.config?.url || '';
      const isPublicEndpoint = url.includes('/social/profile/') || 
                               url.includes('/albums/') ||
                               url.includes('/reviews/recent');
      
      if (!isPublicEndpoint) {
        // Store current path before redirecting to auth
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          sessionStorage.setItem('authReturnPath', currentPath);
          console.log('API 401 - storing path before redirect:', currentPath);
        }
        
        // Handle unauthorized access for protected endpoints
        removeToken();
        window.location.href = '/auth';
      }
    } else if (error.response?.status === 503) {
      // Handle service unavailable (e.g., Last.fm API down)
      error.message = 'Service temporarily unavailable. Please try again later.';
    } else if (error.response?.status >= 500) {
      // Handle server errors with retry for 502/503/504
      if ([502, 503, 504].includes(error.response.status) && !originalRequest._retry) {
        originalRequest._retry = true;
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

        if (originalRequest._retryCount <= MAX_RETRIES) {
          console.log(`Retrying server error (${originalRequest._retryCount}/${MAX_RETRIES})...`);
          await delay(RETRY_DELAY * originalRequest._retryCount);
          return api(originalRequest);
        }
      }
      error.message = 'Server error. Please try again later.';
    }

    return Promise.reject(error);
  }
);

export default api;