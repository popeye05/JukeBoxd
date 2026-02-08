// User types
export interface User {
  id: string;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

// Album types
export interface Album {
  id: string;
  spotifyId: string; // Keep for backward compatibility, but now stores Apple Music ID
  name: string;
  artist: string;
  releaseDate: string;
  imageUrl: string;
  spotifyUrl: string; // Keep for backward compatibility, but now stores Apple Music URL
  createdAt: string;
  updatedAt: string;
}

// Rating types
export interface Rating {
  id: string;
  userId: string;
  albumId: string;
  rating: number; // 1-5
  createdAt: string;
  updatedAt: string;
}

export interface RatingWithDetails extends Rating {
  user?: User;
  album?: Album;
}

// Review types
export interface Review {
  id: string;
  userId: string;
  albumId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User; // Optional populated user data
}

export interface ReviewWithDetails extends Review {
  user?: User;
  album?: Album;
}

// Follow types
export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
}

// Activity types
export type ActivityType = 'rating' | 'review';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  albumId: string;
  data: any; // Rating value or review content
  createdAt: string;
  user?: User; // Optional populated user data
  album?: Album; // Optional populated album data
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

// Search types
export interface SearchResult {
  albums: Album[];
  total: number;
}

// Profile types
export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  ratingsCount: number;
  reviewsCount: number;
}

export interface UserProfileWithStats extends UserProfile {
  // bio, avatarUrl, displayName are inherited from User via UserProfile
  followersCount: number;
  followingCount: number;
  reviewsCount: number;
  ratingsCount: number;
}

export interface UserSearchResponse {
  users: User[];
}