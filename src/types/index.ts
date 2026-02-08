import { Request } from 'express';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  bio?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileWithStats extends UserProfile {
  followerCount: number;
  followingCount: number;
}

export interface AuthToken {
  token: string;
  user: UserProfile;
  expiresAt: Date;
}

// Album types
export interface Album {
  id: string;
  spotifyId: string; // Keep this name for backward compatibility, but it will store TIDAL ID
  name: string;
  artist: string;
  releaseDate: Date;
  imageUrl: string;
  spotifyUrl: string; // Keep this name for backward compatibility, but it will store TIDAL URL
  createdAt: Date;
  updatedAt: Date;
}

export interface TidalAlbum {
  id: string;
  title: string;
  artist: {
    name: string;
  };
  artists?: Array<{ name: string }>;
  releaseDate: string;
  cover: string;
  url: string;
  duration?: number;
  numberOfTracks?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  release_date: string;
  images: Array<{ url: string; height: number; width: number }>;
  external_urls: { spotify: string };
}

// Rating types
export interface Rating {
  id: string;
  userId: string;
  albumId: string;
  rating: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingWithDetails extends Rating {
  user: UserProfile;
  album: Album;
}

// Review types
export interface Review {
  id: string;
  userId: string;
  albumId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewWithDetails extends Review {
  user: UserProfile;
  album: Album;
}

// Social types
export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

export interface FollowWithDetails extends Follow {
  follower: UserProfile;
  followee: UserProfile;
}

// Activity types
export type ActivityType = 'rating' | 'review';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  albumId: string;
  data: any; // Rating value or review content
  createdAt: Date;
}

export interface ActivityWithDetails extends Activity {
  user: UserProfile;
  album: Album;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

// TIDAL API types
export interface TidalSearchResponse {
  albums?: {
    items: TidalAlbum[];
    totalNumberOfItems: number;
  };
}

export interface TidalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Spotify API types (kept for backward compatibility)
export interface SpotifySearchResponse {
  albums: {
    items: SpotifyAlbum[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Database query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}