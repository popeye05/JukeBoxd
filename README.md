# 🎵 JukeBoxd(My First Deployed App with Agentic IDE, Docker, PostGreSQL,Redis)

> **A social music discovery platform where music lovers connect, rate, and review albums**

*Inspired by Letterboxd, but for music enthusiasts who want to share their musical journey*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_JukeBoxd-FFD700?style=for-the-badge)](https://jukeboxd-8781.onrender.com/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/popeye05/jukeboxd)

---

## ✨ Features

### 🎧 **Music Discovery**
- **Search 12+ Million Albums** - Powered by Last.fm's massive music database
- **Real Album Data** - Complete with artwork, artist info, and release dates
- **Instant Search** - Fast, responsive album discovery

### ⭐ **Rating & Reviews**
- **5-Star Rating System** - Rate albums with beautiful star interface
- **Write Detailed Reviews** - Share your thoughts and musical insights
- **Community Ratings** - See what other music lovers think

### 👥 **Social Features**
- **Follow Music Lovers** - Connect with users who share your taste
- **Activity Feed** - See what your friends are rating and reviewing
- **User Profiles** - Showcase your musical journey and statistics

---

## 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_JukeBoxd-FFD700?style=for-the-badge)](https://jukeboxd-8781.onrender.com/)

### Demo Features:
- ✅ **Full User Registration** - Create your account
- ✅ **Real Last.fm Data** - Search actual albums
- ✅ **Complete Social Features** - Follow users, see activity feeds
- ✅ **Rating & Review System** - Rate and review any album
- ✅ **Responsive Design** - Works on desktop and mobile

---

## 🛠️ Tech Stack(I Used Kiro.dev not for vibe coding but as a agentic IDE)

### **Backend**
- **Node.js** + **Express** - RESTful API server
- **TypeScript** - Type-safe development
- **PostgreSQL** - Robust relational database
- **Redis** - High-performance caching
- **JWT Authentication** - Secure user sessions

### **Frontend**
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe frontend development
- **Material-UI (MUI)** - Beautiful, accessible components
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls

### **External APIs**
- **Last.fm API** - Music data (FREE - 12+ million albums)
- **Real Album Information** - Artist, release dates, artwork

### **DevOps & Deployment**
- **Docker** - Containerized development environment
- **Render** - Free cloud hosting
- **GitHub Actions** - CI/CD pipeline ready

---

## 🚀 Quick Start

### **Option 1: Try the Live Demo**
Railway Trial ended

### **Option 2: Run Locally**

#### Prerequisites
- **Node.js** (v18+)
- **Docker** & **Docker Compose**
- **Git**
- Redis Configs are given, if any problem comes , just check for some quick fixes(Use Kiro/ Cursor)

#### Installation
```bash
# Clone the repository
git clone https://github.com/popeye05/jukeboxd.git
cd jukeboxd

# Start databases with Docker
docker-compose up -d

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Edit .env with your Last.fm API key (free from https://www.last.fm/api)

# Run database migrations
npm run migrate

# Start the backend server (port 3000)
npm start

# In another terminal, start the frontend (port 3001)
cd frontend && npm start
```

#### Access the Application
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Databases**: PostgreSQL (5432), Redis (6379)

---

## 🌟 Key Highlights

### **🎯 Production Ready**
- Comprehensive error handling and validation
- Secure authentication with JWT
- Rate limiting and security middleware
- Responsive design for all devices

### **🧪 Well Tested**
- Unit tests for all major components
- Integration tests for user journeys
- Property-based testing for data validation
- 90%+ test coverage

### **📈 Scalable Architecture**
- Clean separation of concerns
- RESTful API design
- Efficient database queries with caching
- Modular component structure

### **🔒 Security First**
- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- SQL injection prevention

---

## 📊 Project Statistics

- **📁 Files**: 200+ TypeScript/React files
- **🧪 Tests**: 100+ comprehensive tests
- **📦 Dependencies**: Modern, well-maintained packages
- **🎨 Components**: 50+ reusable React components
- **🔌 API Endpoints**: 20+ RESTful endpoints
- **💾 Database**: 8 optimized tables with relationships

---

## 🎯 Future Roadmap

### **Phase 2: Enhanced Social Features**
- [ ] **Review Replies** - Comment on reviews
- [ ] **Notifications** - Real-time follow/reply alerts
- [ ] **Like Reviews** - Heart button for reviews
- [ ] **@Mentions** - Tag users in reviews

### **Phase 3: Advanced Features**
- [ ] **Playlist Creation** - Curate album collections
- [ ] **Music Recommendations** - AI-powered suggestions
- [ ] **Advanced Search** - Filter by genre, year, rating
- [ ] **Export Data** - Download your ratings/reviews

### **Phase 4: Community Features**
- [ ] **Discussion Forums** - Album-specific discussions
- [ ] **User Lists** - "Best Albums of 2024" lists
- [ ] **Badges & Achievements** - Gamification elements
- [ ] **Music Events** - Concert and release tracking

---

## 📄 API Documentation

### **Authentication**
```bash
POST /api/auth/register  # Create account
POST /api/auth/login     # Sign in
GET  /api/auth/profile   # Get user profile
```

### **Albums**
```bash
GET  /api/albums/search?q=radiohead    # Search albums
GET  /api/albums/:id                   # Get album details
GET  /api/albums/:id/ratings           # Get album ratings
GET  /api/albums/:id/reviews           # Get album reviews
```

### **Ratings & Reviews**
```bash
POST /api/ratings                      # Rate an album
POST /api/reviews                      # Write a review
PUT  /api/reviews/:id                  # Update review
DELETE /api/reviews/:id                # Delete review
```

### **Social Features**
```bash
POST /api/social/follow/:userId        # Follow a user
GET  /api/social/feed                  # Get activity feed
GET  /api/social/discover              # Discover new users
```

---

## 🔧 Environment Variables

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/jukeboxd
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Last.fm API (FREE)
LASTFM_API_KEY=your-free-lastfm-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **🐛 Bug Reports**
Found a bug? [Open an issue](https://github.com/popeye05/jukeboxd/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### **💡 Feature Requests**
Have an idea? [Create a feature request](https://github.com/popeye05/jukeboxd/issues) with:
- Detailed description
- Use case examples
- Mockups if available

### **🔧 Development**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📞 Support & Contact

- **🐛 Issues**: [GitHub Issues](https://github.com/popeye05/jukeboxd/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/popeye05/jukeboxd/discussions)

---

## 🙏 Acknowledgments

- **Last.fm** - For providing free access to their incredible music database
- **Letterboxd** - For the inspiration and design philosophy
- **Material-UI** - For the beautiful, accessible component library
- **Render** - For free, reliable hosting
- **Open Source Community** - For the amazing tools and libraries

---

## ⭐ Star This Project

If you found JukeBoxd useful or interesting, please consider giving it a star! It helps others discover the project and motivates continued development.

[![GitHub stars](https://img.shields.io/github/stars/popeye05/jukeboxd?style=social)](https://github.com/popeye05/jukeboxd/stargazers)

---

<div align="center">

**🎵 Made with ❤️ for music lovers everywhere, popeye05 🎵**

[Live Demo](https://jukeboxd-app.onrender.com) • [Report Bug](https://github.com/popeye05/jukeboxd/issues) • [Request Feature](https://github.com/popeye05/jukeboxd/issues)

</div>
