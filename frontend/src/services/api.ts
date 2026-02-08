import axios from 'axios';
import { getToken, removeToken } from '../utils/tokenManager';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || (
    process.env.NODE_ENV === 'production'
      ? '/api'  // In production, API is served from same domain
      : 'http://localhost:3001/api'  // In development, backend runs on port 3001
  ),
  timeout: 10000,
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
  (error) => {
    // Handle network errors
    if (!error.response) {
      error.code = 'NETWORK_ERROR';
      error.message = 'Network error. Please check your connection and try again.';
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      // Handle unauthorized access
      removeToken();
      window.location.href = '/auth';
    } else if (error.response?.status === 503) {
      // Handle service unavailable (e.g., Last.fm API down)
      error.message = 'Service temporarily unavailable. Please try again later.';
    } else if (error.response?.status >= 500) {
      // Handle server errors
      error.message = 'Server error. Please try again later.';
    }

    return Promise.reject(error);
  }
);

export default api;