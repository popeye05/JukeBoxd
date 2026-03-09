import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
// @ts-ignore
import * as path from 'path';

import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';
import authRoutes from '@/routes/auth';
import albumRoutes from '@/routes/albums';
import ratingRoutes from '@/routes/ratings';
import reviewRoutes from '@/routes/reviews';
import socialRoutes from '@/routes/social';
import feedRoutes from '@/routes/feed';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Render and other reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
}));
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true  // Allow same origin in production
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: any, res: any) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/feed', feedRoutes);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Handle React routing - send all non-API requests to React app
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server function
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Run migrations automatically in production
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('🔄 Running database migrations...');
        const { query } = await import('@/config/database');
        
        // Enable UUID extension
        await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        
        // Create tables
        await query(`CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          bio TEXT,
          avatar_url TEXT,
          display_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        
        await query(`CREATE TABLE IF NOT EXISTS albums (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          spotify_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          artist VARCHAR(255) NOT NULL,
          release_date DATE,
          image_url TEXT,
          spotify_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        
        await query(`CREATE TABLE IF NOT EXISTS ratings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, album_id)
        );`);
        
        await query(`CREATE TABLE IF NOT EXISTS reviews (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, album_id)
        );`);
        
        await query(`CREATE TABLE IF NOT EXISTS follows (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
          followee_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(follower_id, followee_id),
          CHECK(follower_id != followee_id)
        );`);
        
        await query(`CREATE TABLE IF NOT EXISTS activities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL,
          album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
          data JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);
        
        console.log('✅ Database migrations completed');
      } catch (migrationError) {
        console.warn('⚠️ Migration warning (tables may already exist):', migrationError);
      }
    }

    // Connect to Redis (optional - will fallback to memory store)
    try {
      await connectRedis();
      console.log('✅ Redis connected successfully');
    } catch (redisError: any) {
      console.warn('⚠️ Redis connection failed, using in-memory session store');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };