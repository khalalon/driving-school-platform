# 🚀 Complete Setup Guide - Driving School Platform

## Prerequisites & System Requirements

### Required Software
1. **Git** - Version control
   - Download: https://git-scm.com/
   - Verify: `git --version`

2. **Docker** - Containerization
   - Download: https://www.docker.com/products/docker-desktop
   - Verify: `docker --version`
   - Verify Compose: `docker compose version`

3. **Node.js & npm** - JavaScript runtime (For local development)
   - Download: https://nodejs.org/ (v18 or higher)
   - Verify: `node --version` and `npm --version`

4. **PostgreSQL Client** (Optional, for database management)
   - Download: https://www.postgresql.org/download/
   - Used for running migrations locally

### System Resources Required
- **RAM**: Minimum 4GB free (8GB+ recommended)
- **Disk Space**: ~2GB free
- **Ports Available**: 80, 443, 3001-3008, 5432, 6379

### Supported Operating Systems
- ✅ Windows 10/11 (with WSL2 or Docker Desktop)
- ✅ macOS (Intel or Apple Silicon)
- ✅ Linux (Ubuntu, Debian, CentOS, etc.)

---

## Step 1: Install Prerequisites

### Windows Users
1. Install Docker Desktop:
   - Download from https://www.docker.com/products/docker-desktop
   - Run installer and follow prompts
   - Enable WSL2 integration
   - Restart computer

2. Install Node.js:
   - Download LTS version from https://nodejs.org/
   - Run installer, accept defaults
   - Verify: Open PowerShell and type `node -v`

3. Install Git:
   - Download from https://git-scm.com/
   - Run installer, accept defaults

### macOS Users
```bash
# Using Homebrew (install from https://brew.sh/ if needed)
brew install docker docker-compose node git

# Verify installations
docker --version
docker compose version
node --version
npm --version
git --version
```

### Linux Users (Ubuntu/Debian)
```bash
# Update package manager
sudo apt-get update
sudo apt-get upgrade

# Install Docker
sudo apt-get install docker.io docker-compose

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt-get install git

# Add user to docker group (to run without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
node --version
npm --version
```

---

## Step 2: Clone the Repository

### Option A: Using Git (Recommended)
```bash
# Clone the repository
git clone https://github.com/khalalon/driving-school-platform.git

# Navigate to project directory
cd driving-school-platform

# View available branches
git branch -a
```

### Option B: Download as ZIP
- Go to: https://github.com/khalalon/driving-school-platform
- Click "Code" → "Download ZIP"
- Extract the ZIP file
- Open terminal/PowerShell in the extracted folder

---

## Step 3: Install Dependencies

### Install Backend Dependencies
```bash
# From project root directory
npm install

# Install dependencies for each microservice
cd services/auth && npm install && cd ../..
cd services/school && npm install && cd ../..
cd services/lesson && npm install && cd ../..
cd services/exam && npm install && cd ../..
cd services/payment && npm install && cd ../..
cd services/notification && npm install && cd ../..
cd services/analytics && npm install && cd ../..
cd services/student && npm install && cd ../..
```

### Install Mobile App Dependencies (Optional)
```bash
# Navigate to mobile app
cd mobile-app

# Install dependencies
npm install

# Install Expo CLI globally (optional, for local testing)
npm install -g expo-cli

# Verify
expo --version
```

---

## Step 4: Environment Configuration

### Create .env File (if needed)
Create a `.env` file in the project root:
```bash
# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=driving_school

# Redis Configuration
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Node Environment
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost

# Service URLs
AUTH_SERVICE_URL=http://auth-service:3001
SCHOOL_SERVICE_URL=http://school-service:3002
LESSON_SERVICE_URL=http://lesson-service:3003
EXAM_SERVICE_URL=http://exam-service:3004
PAYMENT_SERVICE_URL=http://payment-service:3005
NOTIFICATION_SERVICE_URL=http://notification-service:3006
STUDENT_SERVICE_URL=http://student-service:3007
ANALYTICS_SERVICE_URL=http://analytics-service:3008
```

---

## Step 5: Start the Platform

### Quick Start with Make (Recommended)
```bash
# Start all services (development mode with hot-reload)
make dev

# View logs from all services
make logs

# Stop all services
make stop

# Restart services
make restart

# Clean up all containers and volumes
make clean
```

### Manual Docker Compose Commands
```bash
# Build all Docker images
docker compose build

# Start all containers in background
docker compose up -d

# View running containers
docker compose ps

# View logs from specific service
docker compose logs auth-service -f

# Stop all containers
docker compose down

# Stop and remove volumes
docker compose down -v
```

### Windows PowerShell Syntax
```powershell
# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down
```

---

## Step 6: Verify Installation

### Check Service Health
```bash
# Test each service health endpoint
curl http://localhost:3001/health    # Auth Service
curl http://localhost:3002/health    # School Service
curl http://localhost:3003/health    # Lesson Service
curl http://localhost:3004/health    # Exam Service
curl http://localhost:3005/health    # Payment Service
curl http://localhost:3006/health    # Notification Service
curl http://localhost:3007/health    # Student Service
curl http://localhost:3008/health    # Analytics Service

# Or through Nginx gateway
curl http://localhost/health          # Main gateway
```

### Windows PowerShell Verification
```powershell
# Test all services
$ports = 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008
foreach ($port in $ports) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -UseBasicParsing
        Write-Host "Port $port : ✓ OK"
    } catch {
        Write-Host "Port $port : ✗ FAILED"
    }
}
```

### Expected Output
```
✓ Auth Service (3001) - Healthy
✓ School Service (3002) - Healthy
✓ Lesson Service (3003) - Healthy
✓ Exam Service (3004) - Healthy
✓ Payment Service (3005) - Healthy
✓ Notification Service (3006) - Healthy
✓ Student Service (3007) - Healthy
✓ Analytics Service (3008) - Healthy
✓ PostgreSQL (5432) - Connected
✓ Redis (6379) - Connected
✓ Nginx Gateway (80/443) - Running
```

---

## Step 7: Database Setup

### Run Migrations
```bash
# Option 1: Using Make command
make migrate

# Option 2: Using Docker
docker exec driving-school-postgres psql -U admin -d driving_school -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# Option 3: Using psql directly (if installed locally)
psql -h localhost -U admin -d driving_school -f migrations/001_initial_schema.sql
```

### Verify Database
```bash
# Connect to PostgreSQL
docker exec -it driving-school-postgres psql -U admin -d driving_school

# List tables
\dt

# Exit psql
\q
```

---

## Step 8: Access the Platform

### Available Endpoints

#### API Gateway (Nginx)
- **Base URL**: `http://localhost`
- **Health Check**: `http://localhost/health`

#### Individual Services
| Service | URL | Port |
|---------|-----|------|
| Auth | http://localhost:3001 | 3001 |
| School | http://localhost:3002 | 3002 |
| Lesson | http://localhost:3003 | 3003 |
| Exam | http://localhost:3004 | 3004 |
| Payment | http://localhost:3005 | 3005 |
| Notification | http://localhost:3006 | 3006 |
| Student | http://localhost:3007 | 3007 |
| Analytics | http://localhost:3008 | 3008 |

#### Database Connections
- **PostgreSQL**: `localhost:5432`
  - Username: `admin`
  - Password: `password`
  - Database: `driving_school`

- **Redis**: `localhost:6379`
  - Password: (none for dev)

---

## Step 9: Develop & Deploy

### Local Development

#### Run Services Locally (Without Docker)
```bash
# Terminal 1: Start PostgreSQL
docker run -d --name postgres -e POSTGRES_PASSWORD=password postgres:15-alpine

# Terminal 2: Start Redis
docker run -d --name redis redis:7-alpine

# Terminal 3-10: Start each service
cd services/auth && npm start
cd services/school && npm start
# ... etc
```

#### Watch Mode for Hot Reload
```bash
# In each service directory
npm run dev

# Or use nodemon globally
npm install -g nodemon
nodemon dist/index.js
```

### Production Deployment

#### Using Docker Compose (Production)
```bash
# Start with production compose file
docker compose -f docker-compose.prod.yml up -d

# Or using Make
make prod
```

#### Deploy to Cloud (AWS, GCP, Azure, DigitalOcean)
```bash
# Build production images
docker compose -f docker-compose.prod.yml build

# Push to Docker registry
docker tag service-name your-registry/service-name:latest
docker push your-registry/service-name:latest

# Deploy using Kubernetes or similar orchestration
kubectl apply -f k8s/
```

---

## Makefile Commands Reference

```bash
# Development
make dev          # Start all services (development)
make install      # Install all dependencies
make build        # Build all Docker images
make logs         # View logs from all services
make restart      # Restart all services
make stop         # Stop all services
make clean        # Remove all containers and volumes

# Database
make migrate      # Run database migrations

# Testing
make test         # Run all tests
make test-api     # Test API endpoints

# Production
make prod         # Start services in production mode
make build-prod   # Build production images
```

---

## Troubleshooting

### Problem: Port Already in Use
```bash
# Find process using port
# Windows
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001

# Kill the process
# Windows
taskkill /PID <PID> /F

# macOS/Linux
kill -9 <PID>
```

### Problem: Docker Not Running
```bash
# Windows/macOS
# Restart Docker Desktop application

# Linux
sudo systemctl restart docker
```

### Problem: Insufficient Memory
```bash
# Increase Docker memory allocation
# Windows/macOS: Docker Desktop → Preferences → Resources → Memory

# Linux: Check available memory
free -h

# Reduce number of running services if needed
docker compose up -d auth-service school-service postgres redis
```

### Problem: Database Connection Failed
```bash
# Check PostgreSQL is running
docker compose ps | grep postgres

# View PostgreSQL logs
docker compose logs postgres

# Reset database
docker compose down -v
docker compose up -d postgres
```

### Problem: Service Health Check Failing
```bash
# Check service logs
docker compose logs <service-name>

# Verify service is responding
curl http://localhost:<port>/health

# Restart the service
docker compose restart <service-name>
```

---

## Performance Optimization

### Enable Production Mode
```bash
# Set environment variable
export NODE_ENV=production

# Or in .env file
NODE_ENV=production
```

### Optimize Docker Images
```bash
# Use production compose file
docker compose -f docker-compose.prod.yml up -d

# Prune unused Docker resources
docker system prune -a
docker volume prune
```

### Database Optimization
```sql
-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_lessons_instructor ON lessons(instructor_id);

-- Monitor query performance
EXPLAIN ANALYZE SELECT * FROM lessons WHERE instructor_id = 1;
```

---

## Security Checklist

### Before Production
- [ ] Change default PostgreSQL password
- [ ] Generate strong JWT_SECRET
- [ ] Enable HTTPS/SSL in Nginx
- [ ] Set up firewall rules
- [ ] Enable authentication on Redis
- [ ] Set up API rate limiting
- [ ] Enable CORS with allowed domains
- [ ] Set secure cookie flags
- [ ] Enable SQL injection prevention
- [ ] Set up logging and monitoring
- [ ] Enable backups for PostgreSQL
- [ ] Set up error tracking (Sentry)

---

## Next Steps

1. **Configure Authentication**: Set up JWT secrets and authentication
2. **Setup Payment Gateway**: Configure Stripe/PayPal integration
3. **Setup Notifications**: Configure email (SendGrid) and SMS (Twilio)
4. **Mobile App**: Build and deploy mobile app
5. **Analytics**: Set up analytics dashboard
6. **Monitoring**: Configure error tracking and performance monitoring
7. **Backups**: Set up automated database backups
8. **CI/CD**: Configure GitHub Actions or similar

---

## Support & Documentation

- **GitHub Issues**: https://github.com/khalalon/driving-school-platform/issues
- **Documentation**: See README.md for detailed information
- **API Testing**: See API_TESTING.md
- **Docker Setup**: See DOCKER_SETUP.md
- **Mobile App**: See mobile-app/MOBILE_APP_COMPLETE.md

---

## Quick Reference Commands

```bash
# Start development environment
make dev

# View all services status
docker compose ps

# Check specific service logs
docker compose logs -f <service-name>

# Execute command in container
docker compose exec <service-name> npm test

# Scale a service
docker compose up -d --scale auth-service=3

# Stop everything
make stop

# Clean everything
make clean
```

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Author**: Development Team

For detailed API documentation, see the individual service READMEs in `services/*/README.md`
