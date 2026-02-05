# Starting JukeBoxd Locally

## Prerequisites

1. **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL 12+** - Download from [postgresql.org](https://www.postgresql.org/download/)
3. **Redis 6+** - Install via Docker or WSL

## Option 1: Using Docker (Recommended)

If you have Docker installed:

```bash
# Start databases
docker-compose up -d

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Build and run backend
npm run build
npm run db:migrate
npm run dev

# In a new terminal, start frontend
cd frontend
npm start
```

## Option 2: Manual Installation

### 1. Install Node.js and npm
- Download from [nodejs.org](https://nodejs.org/)
- Verify installation: `node --version` and `npm --version`

### 2. Install PostgreSQL
- Download from [postgresql.org](https://www.postgresql.org/download/)
- Create databases:
  ```sql
  CREATE DATABASE jukeboxd;
  CREATE DATABASE jukeboxd_test;
  ```

### 3. Install Redis
- **Windows**: Use WSL or Docker
- **macOS**: `brew install redis`
- **Linux**: `sudo apt-get install redis-server`

### 4. Start the Application

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Build backend
npm run build

# Run database migrations
npm run db:migrate

# Start backend server (Terminal 1)
npm run dev

# Start frontend server (Terminal 2)
cd frontend
npm start
```

## Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## Environment Configuration

Make sure your `.env` file has the correct database URLs:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/jukeboxd
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5433/jukeboxd_test
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Common Issues:

1. **"npm not found"**: Install Node.js from nodejs.org
2. **Database connection error**: Make sure PostgreSQL is running
3. **Redis connection error**: Make sure Redis is running
4. **Port already in use**: Change PORT in .env file

### Verify Services:

```bash
# Check if PostgreSQL is running
psql -U postgres -h localhost -p 5432 -d jukeboxd

# Check if Redis is running
redis-cli ping

# Check if backend is running
curl http://localhost:3000/health
```

## Development Workflow

1. **Backend changes**: Server auto-restarts with `npm run dev`
2. **Frontend changes**: React auto-reloads with `npm start`
3. **Database changes**: Run `npm run db:migrate` after schema updates
4. **Run tests**: `npm test` (backend) or `cd frontend && npm test` (frontend)