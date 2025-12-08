# Driving School Management Platform - Complete Overview

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Development Workflow](#development-workflow)
7. [Deployment & Hosting](#deployment--hosting)
8. [Makefile Commands](#makefile-commands)
9. [Production Considerations](#production-considerations)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🎯 Project Overview

### What is This Platform?

A **complete microservices-based driving school management system** that handles:
- Student registration and management
- Lesson scheduling and booking
- Instructor management
- Exam registration and results
- Payment processing
- Real-time notifications
- Analytics and reporting

### Target Users
- **Students**: Book lessons, take exams, make payments
- **Instructors**: View schedule, mark attendance, provide feedback
- **Administrators**: Manage schools, pricing, view analytics
- **School Owners**: Monitor performance, revenue, student progress

### Key Features
✅ Multi-tenant (multiple driving schools)
✅ Role-based access control (Admin/Instructor/Student)
✅ Real-time notifications (Push, Email, SMS)
✅ Payment processing (Online/Cash/Card)
✅ Comprehensive analytics and reporting
✅ RESTful APIs for all operations
✅ Scalable microservices architecture

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
│              iOS & Android + Web Dashboard                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS/REST
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   API Gateway (Nginx)                        │
│         Rate Limiting • Load Balancing • SSL                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼─────────┐
│   PostgreSQL   │         │      Redis       │
│   (Database)   │         │     (Cache)      │
└────────────────┘         └──────────────────┘
        │
        │
┌───────┴────────────────────────────────────────────────┐
│              Microservices Layer                       │
├────────────────────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│ │   Auth   │  │  School  │  │  Lesson  │            │
│ │  :3001   │  │  :3002   │  │  :3003   │            │
│ └──────────┘  └──────────┘  └──────────┘            │
│                                                        │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│ │   Exam   │  │ Payment  │  │ Notify   │            │
│ │  :3004   │  │  :3005   │  │  :3006   │            │
│ └──────────┘  └──────────┘  └──────────┘            │
│                                                        │
│ ┌──────────┐                                          │
│ │Analytics │                                          │
│ │  :3007   │                                          │
│ └──────────┘                                          │
└────────────────────────────────────────────────────────┘
```

### Microservices Breakdown

#### 1. **Auth Service** (Port 3001)
- User registration & login
- JWT token generation & validation
- Role-based access control
- Session management with Redis
- Password hashing with bcrypt

#### 2. **School Service** (Port 3002)
- School CRUD operations
- Instructor management
- Pricing configuration
- School-instructor relationships

#### 3. **Lesson Service** (Port 3003)
- Lesson scheduling
- Booking management
- Availability tracking
- Attendance marking
- Lesson ratings & feedback

#### 4. **Exam Service** (Port 3004)
- Exam creation & scheduling
- Student eligibility checks
- Exam registration
- Result recording
- Theory & practical exam types

#### 5. **Payment Service** (Port 3005)
- Payment creation & processing
- Multiple payment methods (online, cash, card)
- Payment status tracking
- Refund handling
- Student payment summaries

#### 6. **Notification Service** (Port 3006)
- Push notifications (Expo)
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- Notification preferences
- In-app notifications

#### 7. **Analytics Service** (Port 3007)
- Revenue reports
- Lesson statistics
- Exam performance metrics
- Student engagement tracking
- Instructor performance
- Dashboard summaries with Redis caching

---

## 🛠️ Technology Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching & session storage
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - API Gateway & reverse proxy
- **GitHub Actions** - CI/CD pipeline

### Code Quality
- **Jest** - Testing framework (70% coverage minimum)
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Run linters on staged files

### Design Patterns
- **SOLID Principles** - Throughout codebase
- **Repository Pattern** - Data access layer
- **Dependency Injection** - Loose coupling
- **Strategy Pattern** - Payment methods, notifications
- **Factory Pattern** - Object creation

---

## 📁 Project Structure

```
driving-school-platform/
├── .github/
│   └── workflows/
│       ├── auth-service.yml       # CI/CD for auth
│       ├── school-service.yml     # CI/CD for school
│       ├── lesson-service.yml     # CI/CD for lesson
│       ├── exam-service.yml       # CI/CD for exam
│       ├── payment-service.yml    # CI/CD for payment
│       ├── notification-service.yml
│       └── analytics-service.yml
│
├── services/
│   ├── auth/                      # Authentication service
│   │   ├── src/
│   │   │   ├── config/           # Database, Redis config
│   │   │   ├── controllers/      # Request handlers
│   │   │   ├── middleware/       # Auth, validation
│   │   │   ├── repositories/     # Data access
│   │   │   ├── routes/           # API routes
│   │   │   ├── services/         # Business logic
│   │   │   ├── types/            # TypeScript types
│   │   │   ├── validators/       # Input validation
│   │   │   └── index.ts          # Entry point
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── .eslintrc.json
│   │
│   ├── school/                    # School management service
│   ├── lesson/                    # Lesson scheduling service
│   ├── exam/                      # Exam management service
│   ├── payment/                   # Payment processing service
│   ├── notification/              # Notification service
│   └── analytics/                 # Analytics & reporting service
│
├── gateway/
│   ├── nginx.conf                # Nginx configuration
│   ├── proxy_params.conf         # Proxy settings
│   └── Dockerfile
│
├── scripts/
│   ├── quick-start.sh            # Quick setup script
│   ├── test-api.sh               # API testing script
│   └── deploy.sh                 # Deployment script
│
├── migrations/
│   └── 001_initial_schema.sql    # Database schema
│
├── docker-compose.yml            # Local development
├── docker-compose.prod.yml       # Production setup
├── .env.example                  # Environment template
├── Makefile                      # Build automation
├── README.md                     # Project documentation
└── API_TESTING.md               # API documentation

# Each service follows this structure:
services/[service-name]/
├── src/
│   ├── config/              # Configuration files
│   ├── controllers/         # HTTP request handlers
│   │   └── __tests__/      # Controller tests
│   ├── middleware/          # Express middleware
│   ├── repositories/        # Database access layer
│   │   └── __tests__/      # Repository tests
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic layer
│   │   └── __tests__/      # Service tests
│   ├── types/               # TypeScript interfaces
│   ├── validators/          # Input validation schemas
│   └── index.ts             # Service entry point
├── Dockerfile               # Container definition
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript config
├── jest.config.js           # Test configuration
├── .eslintrc.json           # Linting rules
├── .prettierrc              # Code formatting
└── .env.example             # Environment variables
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git

# Optional for local development
- Node.js (v18+)
- npm or yarn
- PostgreSQL client (psql)
- Redis client (redis-cli)
```

### Installation Steps

#### 1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/driving-school-platform.git
cd driving-school-platform
```

#### 2. **Setup Environment Variables**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Key Environment Variables:**
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=driving_school
DB_USER=admin
DB_PASSWORD=change_in_production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=another_secret_key
REFRESH_TOKEN_EXPIRES_IN=7d

# Services (if running separately)
AUTH_SERVICE_URL=http://auth-service:3001
SCHOOL_SERVICE_URL=http://school-service:3002
# ... etc

# External Services (Optional)
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
EXPO_ACCESS_TOKEN=your_expo_token
```

#### 3. **Quick Start (Automated)**
```bash
# Run the quick start script
chmod +x scripts/quick-start.sh
./scripts/quick-start.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Setup environment
- ✅ Start PostgreSQL & Redis
- ✅ Run database migrations
- ✅ Build all services
- ✅ Start all services
- ✅ Health check all services

#### 4. **Manual Start (Alternative)**
```bash
# Start infrastructure
docker-compose up -d postgres redis

# Wait for database
sleep 10

# Run migrations
docker exec -i driving-school-postgres psql -U admin -d driving_school < migrations/001_initial_schema.sql

# Build and start all services
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

#### 5. **Verify Services**
```bash
# Check all services are running
docker-compose ps

# Test health endpoints
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # School
curl http://localhost:3003/health  # Lesson
curl http://localhost:3004/health  # Exam
curl http://localhost:3005/health  # Payment
curl http://localhost:3006/health  # Notification
curl http://localhost:3007/health  # Analytics

# Or use the health check script
./scripts/health-check.sh
```

---

## 💻 Development Workflow

### Local Development

#### Running Individual Services
```bash
# Navigate to service
cd services/auth

# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

#### Working with Database
```bash
# Connect to PostgreSQL
docker exec -it driving-school-postgres psql -U admin -d driving_school

# Common SQL commands
\dt                    # List all tables
\d users               # Describe users table
SELECT * FROM users;   # Query data

# Backup database
docker exec driving-school-postgres pg_dump -U admin driving_school > backup.sql

# Restore database
docker exec -i driving-school-postgres psql -U admin -d driving_school < backup.sql
```

#### Working with Redis
```bash
# Connect to Redis
docker exec -it driving-school-redis redis-cli

# Common Redis commands
KEYS *                 # List all keys
GET auth:user:123      # Get a key
DEL auth:user:123      # Delete a key
FLUSHALL               # Clear all data (careful!)
```

### Testing

#### Unit Tests
```bash
# Run tests for a service
cd services/auth
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch

# Single test file
npm test -- src/services/__tests__/auth.service.test.ts
```

#### Integration Tests
```bash
# Test API endpoints
./scripts/test-api.sh

# Or manually
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@drivingschool.com","password":"admin123"}'
```

#### Load Testing (Optional)
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  let res = http.get('http://localhost:3001/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

### Code Quality Checks

#### Pre-commit Hooks (Automatic)
```bash
# Husky runs automatically on git commit
git add .
git commit -m "Add new feature"

# This triggers:
# 1. ESLint check
# 2. Prettier formatting
# 3. Jest tests for changed files
```

#### Manual Quality Checks
```bash
# Lint all services
for service in services/*/; do
  cd "$service"
  npm run lint
  cd ../..
done

# Format all code
for service in services/*/; do
  cd "$service"
  npm run format
  cd ../..
done

# Run all tests
for service in services/*/; do
  cd "$service"
  npm test
  cd ../..
done
```

---

## 🌐 Deployment & Hosting

### Deployment Options

#### Option 1: Docker Compose (Simple - Good for small scale)

**Pros:**
- Simple setup
- Low cost (single VPS)
- Easy to manage

**Cons:**
- Limited scalability
- Single point of failure
- Manual scaling

**Steps:**
```bash
# 1. Get a VPS (DigitalOcean, Linode, AWS EC2)
# Ubuntu 22.04, 4GB RAM minimum

# 2. Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo apt install docker-compose

# 3. Clone repository
git clone https://github.com/yourusername/driving-school-platform.git
cd driving-school-platform

# 4. Setup production environment
cp .env.example .env
nano .env  # Edit with production values

# 5. Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# 6. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**Cost Estimate:**
- VPS: $20-50/month (4GB RAM, 2 vCPU)
- Domain: $10-15/year
- **Total: ~$30/month**

---

#### Option 2: Kubernetes (Advanced - Production scale)

**Pros:**
- Auto-scaling
- High availability
- Load balancing
- Rolling updates
- Self-healing

**Cons:**
- More complex
- Higher cost
- Requires k8s knowledge

**Setup:**
```bash
# 1. Create Kubernetes cluster
# - Google Kubernetes Engine (GKE)
# - Amazon EKS
# - DigitalOcean Kubernetes
# - Azure AKS

# 2. Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/

# 3. Create Kubernetes manifests (see k8s/ folder)

# 4. Deploy services
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/database.yml
kubectl apply -f k8s/redis.yml
kubectl apply -f k8s/services/

# 5. Setup ingress
kubectl apply -f k8s/ingress.yml

# 6. Monitor
kubectl get pods
kubectl logs -f <pod-name>
```

**Cost Estimate:**
- Managed K8s: $50-100/month
- Worker nodes: $30-60/month each (3 minimum)
- Load balancer: $10-20/month
- **Total: $150-250/month**

---

#### Option 3: Serverless (AWS Lambda/Google Cloud Run)

**Pros:**
- Pay per use
- Auto-scaling
- Zero infrastructure management

**Cons:**
- Cold starts
- Limited execution time
- Vendor lock-in
- More expensive at scale

**Cost Estimate:**
- Variable based on usage
- **Typical: $50-200/month**

---

#### Option 4: Platform as a Service (Heroku, Render, Railway)

**Pros:**
- Easiest deployment
- Managed infrastructure
- Built-in CI/CD

**Cons:**
- More expensive
- Less control
- Vendor lock-in

**Example with Railway:**
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Deploy services
railway up

# 5. Add database
railway add postgres redis
```

**Cost Estimate:**
- Railway/Render: $60-150/month
- Heroku: $100-300/month

---

### Recommended Deployment Strategy

#### For MVP/Small Scale (< 1000 users)
**Use Docker Compose on VPS**
- Cost: ~$30/month
- Complexity: Low
- Scalability: Limited but sufficient

**Setup:**
```bash
# VPS Provider: DigitalOcean Droplet
# Size: 4GB RAM, 2 vCPU, 80GB SSD
# OS: Ubuntu 22.04

# 1. Setup server
ssh root@your-server-ip

# 2. Install dependencies
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clone and deploy
git clone your-repo
cd driving-school-platform
./scripts/deploy.sh
```

#### For Growth Phase (1K-10K users)
**Use Managed Kubernetes**
- Cost: $150-250/month
- Complexity: Medium
- Scalability: Excellent

#### For Enterprise (10K+ users)
**Use Kubernetes with autoscaling**
- Cost: $500+/month
- Complexity: High
- Scalability: Unlimited

---

## 📘 Makefile Commands

### What is a Makefile?

A **Makefile** is a build automation tool that contains a set of directives (called "targets") to compile, test, and deploy your project. It's like having a collection of useful commands in one place.

### Why Use a Makefile?

Instead of typing long commands like:
```bash
docker-compose -f docker-compose.yml up -d --build
```

You can just type:
```bash
make start
```

### How to Use Makefile

```bash
# Show all available commands
make help

# Start the platform
make start

# View logs
make logs

# Run tests
make test

# Stop everything
make stop

# Clean and restart
make clean
make start

# Deploy to production
make deploy
```

### Common Makefile Usage Examples

```bash
# First time setup
make setup

# Daily development
make start          # Morning: start services
make logs-auth      # Check auth service logs
make test-auth      # Test after changes
make restart        # Apply changes

# Before committing code
make lint           # Check code quality
make test           # Run all tests
make format         # Format code

# Database operations
make db-backup      # Backup before changes
make db-migrate     # Apply migrations
make db-restore     # Rollback if needed

# Deployment
make deploy         # Deploy to production
make prod           # Start in production mode
```

---

## 🔒 Production Considerations

### Security Checklist

#### Environment Variables
```bash
# ❌ NEVER commit these to Git
JWT_SECRET=use_strong_random_string_min_32_chars
DB_PASSWORD=use_strong_password_min_16_chars
REDIS_PASSWORD=use_strong_password

# ✅ Generate strong secrets
openssl rand -base64 32

# ✅ Use environment variable management
# - AWS Secrets Manager
# - HashiCorp Vault
# - Docker Secrets
```

#### Database Security
```bash
# ✅ Change default credentials
DB_USER=custom_user_not_admin
DB_PASSWORD=strong_random_password

# ✅ Restrict network access
# Only allow specific IPs in PostgreSQL pg_hba.conf

# ✅ Enable SSL connections
DB_SSL=true

# ✅ Regular backups
# Automated daily backups to S3/Cloud Storage
```

#### API Security
```bash
# ✅ Enable rate limiting (already configured in Nginx)
# ✅ Use HTTPS only (no HTTP)
# ✅ CORS properly configured
# ✅ Input validation (using Joi)
# ✅ SQL injection prevention (using parameterized queries)
# ✅ XSS prevention (using helmet.js)
```

#### Network Security
```bash
# ✅ Use private networks for services
# ✅ Firewall rules (only open necessary ports)
# ✅ DDoS protection (Cloudflare, AWS Shield)
# ✅ SSL certificates (Let's Encrypt, AWS ACM)
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_lessons_date_status ON lessons(date_time, status);
CREATE INDEX idx_payments_student_status ON payments(student_id, status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM lessons WHERE date_time > NOW();

-- Regular maintenance
VACUUM ANALYZE;
REINDEX DATABASE driving_school;
```

#### Redis Caching
```javascript
// Cache frequently accessed data
// Already implemented in analytics service

// Example cache strategy:
// - User sessions: 1 hour TTL
// - Analytics reports: 1 hour TTL
// - Static data: 24 hour TTL
```

#### Connection Pooling
```javascript
// Already configured in database.ts
pool: {
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

### Monitoring Setup

#### Application Monitoring
```bash
# Option 1: Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Option 2: DataDog
# Add DataDog agent to docker-compose

# Option 3: New Relic
# Add New Relic agent to each service
```

#### Log Aggregation
```bash
# Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)
# Option 2: Loki + Grafana
# Option 3: Cloud providers (AWS CloudWatch, GCP Logging)

# Simple log viewing
docker-compose logs -f --tail=100
```

#### Health Checks
```bash
# Already implemented /health endpoints
# Setup external monitoring:
# - UptimeRobot (free)
# - Pingdom
# - StatusCake

# Example health check endpoint
curl https://api.yourplatform.com/health
```

### Backup Strategy

#### Database Backups
```bash
# Automated daily backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
docker exec driving-school-postgres pg_dump -U admin driving_school | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
EOF

# Add to crontab (run daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

#### File Backups
```bash
# If storing files (profile photos, etc.)
# Use S3 or similar object storage
# Enable versioning
# Setup lifecycle policies
```

### Disaster Recovery

#### Backup Verification
```bash
# Test restores monthly
make db-backup
make db-restore

# Verify data integrity
```

#### High Availability
```bash
# Database replication
# - Primary-Replica setup
# - Automatic failover

# Service redundancy
# - Multiple instances of each service
# - Load balancing

# Geographic redundancy
# - Multi-region deployment
# - CDN for static assets
```

---

## 📊 Monitoring & Maintenance

### Daily Tasks
```bash
# Check service health
make health

# Review logs for errors
make logs | grep ERROR

# Check disk space
df -h

# Check database connections
docker exec driving-school-postgres psql -U admin -d driving_school -c "SELECT count(*) FROM pg_stat_activity;"
```

### Weekly Tasks
```bash
# Review analytics
# Check error rates
# Review slow queries
# Update dependencies

# Security updates
docker-compose pull
make restart
```

### Monthly Tasks
```bash
# Test backups
make db-restore

# Performance review
# Cost analysis
# Security audit
# Dependency updates

# Database maintenance
docker exec driving-school-postgres psql -U admin -d driving_school -c "VACUUM ANALYZE;"
```

---

## 🎓 Learning Resources

### Understanding the Codebase
1. Start with `services/auth` - simplest service
2. Follow a request through: Route → Controller → Service → Repository
3. Read tests to understand expected behavior
4. Check `types/` folder for data structures

### SOLID Principles in Action
- **S**: Each service has one responsibility
- **O**: Payment strategies can be extended without modifying existing code
- **L**: All repositories implement the same interface
- **I**: Small, focused interfaces (IDatabase, ICache)
- **D**: Services depend on interfaces, not implementations

### Useful Commands Reference
```bash
# Docker
docker ps                          # List containers
docker logs -f <container>         # Follow logs
docker exec -it <container> bash   # Shell into container
docker system prune -f             # Clean up

# Git
git status                         # Check changes
git add .                          # Stage changes
git commit -m "message"            # Commit
git push                           # Push to remote

# Make
make help                          # Show all commands
make start                         # Start platform
make test                          # Run tests
make logs                          # View logs

# Database
make db-backup                     # Backup database
make db-migrate                    # Run migrations
make db-restore                    # Restore backup
```

---

## 🆘 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs auth-service

# Common causes:
# 1. Port already in use
# 2. Database not ready
# 3. Environment variables missing
# 4. Build failed

# Solutions:
make stop
make clean
make start
```

#### Database Connection Error
```bash
# Check database is running
docker ps | grep postgres

# Check connection
docker exec driving-school-postgres pg_isready -U admin

# Restart database
docker-compose restart postgres

# Check credentials in .env
```

#### "Module not found" Error
```bash
# Rebuild service
cd services/auth
npm install
npm run build

# Or rebuild Docker image
docker-compose build auth-service
```

#### High CPU/Memory Usage
```bash
# Check resource usage
docker stats

# Identify problem service
# Scale down or optimize

# Add resource limits in docker-compose.yml
```

---

## 📝 Next Steps

Now that you understand the full project:

### To Start Development:
```bash
# 1. Clone and setup
git clone your-repo
cd driving-school-platform
make setup

# 2. Start coding
# Pick a service to work on
cd services/auth
npm run dev

# 3. Make changes and test
npm test
make lint

# 4. Commit
git add .
git commit -m "Your changes"
git push
```

### To Deploy:
```bash
# 1. Choose hosting (start with VPS + Docker Compose)
# 2. Setup server
# 3. Clone repository
# 4. Configure environment
# 5. Run deployment
make deploy
```

### To Build Mobile App:
```bash
# Ready to start the React Native app
# This will connect to your running backend
cd mobile-app
npx expo start
```

---

## 🤝 Support

- **Documentation**: See API_TESTING.md for API docs
- **Issues**: Check GitHub issues
- **Updates**: `git pull && make update`
