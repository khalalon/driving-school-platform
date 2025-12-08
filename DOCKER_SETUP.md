# Docker Compose Setup Guide

Complete Docker orchestration for the Driving School Platform with all 6 microservices.

## Quick Start

### Development Mode
```bash
# Start all services with hot reload
make dev

# Or manually
./scripts/docker-dev.sh
```

### Production Mode
```bash
# Setup environment
cp .env.example .env
# Edit .env with your production values

# Start production stack
make prod
```

## Architecture
```
┌─────────────┐
│    Nginx    │  Port 80 (Reverse Proxy)
└──────┬──────┘
       │
       ├─────────────────────────────────────────┐
       │                                         │
   ┌───▼────┐  ┌────────┐  ┌────────┐  ┌────────┐
   │  Auth  │  │ School │  │ Lesson │  │  Exam  │
   │  :3001 │  │ :3002  │  │ :3003  │  │ :3004  │
   └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
       │           │           │           │
   ┌───▼────┐  ┌──▼─────┐     │           │
   │Payment │  │Notif.  │     │           │
   │ :3005  │  │ :3006  │     │           │
   └───┬────┘  └───┬────┘     │           │
       │           │           │           │
       └───────────┴───────────┴───────────┘
                   │
           ┌───────┴────────┐
           │                │
      ┌────▼────┐     ┌─────▼─────┐
      │PostgreSQL│     │   Redis   │
      │  :5432   │     │   :6379   │
      └──────────┘     └───────────┘
```

## Available Commands
```bash
make help          # Show all commands
make dev           # Start development environment
make prod          # Start production environment
make stop          # Stop all services
make clean         # Remove all containers and volumes
make logs          # View all logs
make logs SERVICE=auth-service  # View specific service logs
make restart SERVICE=auth-service  # Restart specific service
make ps            # Show running containers
make stats         # Show resource usage
make migrate       # Run database migrations
make backup-db     # Backup PostgreSQL database
make restore-db FILE=backup.sql  # Restore database
```

## Service URLs

### Development
- **Auth Service**: http://localhost:3001
- **School Service**: http://localhost:3002
- **Lesson Service**: http://localhost:3003
- **Exam Service**: http://localhost:3004
- **Payment Service**: http://localhost:3005
- **Notification Service**: http://localhost:3006
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **pgAdmin**: http://localhost:5050 (admin@drivingschool.com / admin)
- **Redis Commander**: http://localhost:8081

### Production (via Nginx)
- **API Gateway**: http://localhost
- **All services**: http://localhost/api/{service}

## Environment Variables

Key variables in `.env`:
```bash
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=strong-password-here
POSTGRES_DB=driving_school

# Auth
JWT_SECRET=your-super-secret-jwt-key

# Payment
STRIPE_SECRET_KEY=sk_live_your_key

# Notifications
EXPO_ACCESS_TOKEN=your_expo_token
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
```

## Volumes

Data is persisted in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis persistence

## Health Checks

All services include health checks:
- PostgreSQL: `pg_isready`
- Redis: `redis-cli ping`
- Services: `curl /health`

View health status:
```bash
docker-compose ps
```

## Scaling Services

Scale a service to multiple replicas:
```bash
docker-compose up -d --scale auth-service=3
docker-compose up -d --scale lesson-service=2
```

## Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100

# With timestamps
docker-compose logs -f -t
```

## Database Management

### Access PostgreSQL CLI
```bash
make shell-postgres

# Or manually
docker exec -it driving-school-postgres psql -U admin -d driving_school
```

### Backup Database
```bash
make backup-db
# Saves to backups/backup_YYYYMMDD_HHMMSS.sql
```

### Restore Database
```bash
make restore-db FILE=backups/backup_20240101_120000.sql
```

### Run Migrations
```bash
make migrate
```

## Redis Management

### Access Redis CLI
```bash
make shell-redis

# Or manually
docker exec -it driving-school-redis redis-cli
```

### Redis Commander UI
Open http://localhost:8081 in your browser

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs service-name

# Restart service
make restart SERVICE=service-name

# Rebuild service
docker-compose build service-name
docker-compose up -d service-name
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec -it driving-school-postgres pg_isready -U admin
```

### Port already in use
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3101
```

### Clean slate
```bash
# Remove everything and start fresh
make clean
make dev
```

## Performance Tuning

### Resource Limits (Production)
Configured in `docker-compose.prod.yml`:
- PostgreSQL: 2 CPU, 2GB RAM
- Redis: 1 CPU, 512MB RAM
- Services: 1 CPU, 512MB RAM each

### Increase limits
Edit `docker-compose.prod.yml`:
```yaml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

## Monitoring

### Resource Usage
```bash
make stats

# Detailed stats
docker stats
```

### Network Inspection
```bash
# List networks
docker network ls

# Inspect network
docker network inspect driving-school-platform_driving-school-network
```

## Security

### Update Secrets
Never commit `.env` file. Always use strong passwords:
```bash
# Generate random password
openssl rand -base64 32
```

### SSL/TLS (Production)
Configure SSL certificates in `nginx/ssl/`:
```bash
# Generate self-signed cert (development)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem
```

## CI/CD Integration

GitHub Actions automatically:
1. Builds Docker images
2. Pushes to registry
3. Deploys to production

See `.github/workflows/ci-cd.yml`

## FAQ

**Q: How do I add a new service?**
A: Add to `docker-compose.yml` and create corresponding Dockerfile

**Q: Can I use this in production?**
A: Yes, use `docker-compose.prod.yml` with proper environment variables

**Q: How do I update a service?**
A: `docker-compose build service-name && docker-compose up -d service-name`

**Q: Where are logs stored?**
A: Check `docker-compose logs` or `/var/lib/docker/containers/`

## Support

For issues:
1. Check service logs
2. Verify environment variables
3. Ensure all dependencies are running
4. Review this documentation

## Next Steps

1. Configure `.env` with production values
2. Setup SSL certificates
3. Configure external database (optional)
4. Setup monitoring (Prometheus/Grafana)
5. Configure backups automation
