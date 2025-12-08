.PHONY: help dev prod stop clean logs restart build test migrate ps stats health install lint format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev: ## Start development environment
	@./scripts/docker-dev.sh

prod: ## Start production environment
	@./scripts/docker-prod.sh

stop: ## Stop all services
	@./scripts/docker-stop.sh

clean: ## Clean up all Docker resources
	@./scripts/docker-clean.sh

logs: ## View logs (use SERVICE=name for specific service)
	@./scripts/docker-logs.sh $(SERVICE)

restart: ## Restart a service (use SERVICE=name)
	@./scripts/docker-restart.sh $(SERVICE)

build: ## Build all Docker images
	@docker-compose build

test: ## Run tests for all services
	@echo "Running tests for all services..."
	@cd services/auth && npm test
	@cd services/school && npm test
	@cd services/lesson && npm test
	@cd services/exam && npm test
	@cd services/payment && npm test
	@cd services/notification && npm test
	@cd services/analytics && npm test

test-auth: ## Run tests for auth service only
	@cd services/auth && npm test

test-school: ## Run tests for school service only
	@cd services/school && npm test

test-lesson: ## Run tests for lesson service only
	@cd services/lesson && npm test

test-exam: ## Run tests for exam service only
	@cd services/exam && npm test

test-payment: ## Run tests for payment service only
	@cd services/payment && npm test

test-notification: ## Run tests for notification service only
	@cd services/notification && npm test

test-analytics: ## Run tests for analytics service only
	@cd services/analytics && npm test

migrate: ## Run database migrations
	@echo "Running database migrations..."
	@docker exec driving-school-postgres psql -U admin -d driving_school -f /docker-entrypoint-initdb.d/001_initial_schema.sql

ps: ## Show running containers
	@docker-compose ps

stats: ## Show container stats
	@docker stats --no-stream

health: ## Check health of all services
	@echo "🏥 Checking service health..."
	@curl -sf http://localhost:3001/health > /dev/null && echo "✅ Auth service (3001) is healthy" || echo "❌ Auth service (3001) is down"
	@curl -sf http://localhost:3002/health > /dev/null && echo "✅ School service (3002) is healthy" || echo "❌ School service (3002) is down"
	@curl -sf http://localhost:3003/health > /dev/null && echo "✅ Lesson service (3003) is healthy" || echo "❌ Lesson service (3003) is down"
	@curl -sf http://localhost:3004/health > /dev/null && echo "✅ Exam service (3004) is healthy" || echo "❌ Exam service (3004) is down"
	@curl -sf http://localhost:3005/health > /dev/null && echo "✅ Payment service (3005) is healthy" || echo "❌ Payment service (3005) is down"
	@curl -sf http://localhost:3006/health > /dev/null && echo "✅ Notification service (3006) is healthy" || echo "❌ Notification service (3006) is down"
	@curl -sf http://localhost:3007/health > /dev/null && echo "✅ Analytics service (3007) is healthy" || echo "❌ Analytics service (3007) is down"

install: ## Install dependencies for all services
	@echo "📦 Installing dependencies for all services..."
	@cd services/auth && npm install
	@cd services/school && npm install
	@cd services/lesson && npm install
	@cd services/exam && npm install
	@cd services/payment && npm install
	@cd services/notification && npm install
	@cd services/analytics && npm install
	@echo "✅ All dependencies installed"

lint: ## Lint all services
	@echo "🔍 Linting all services..."
	@cd services/auth && npm run lint
	@cd services/school && npm run lint
	@cd services/lesson && npm run lint
	@cd services/exam && npm run lint
	@cd services/payment && npm run lint
	@cd services/notification && npm run lint
	@cd services/analytics && npm run lint
	@echo "✅ Linting complete"

format: ## Format code for all services
	@echo "✨ Formatting code for all services..."
	@cd services/auth && npm run format
	@cd services/school && npm run format
	@cd services/lesson && npm run format
	@cd services/exam && npm run format
	@cd services/payment && npm run format
	@cd services/notification && npm run format
	@cd services/analytics && npm run format
	@echo "✅ Formatting complete"

shell-postgres: ## Open PostgreSQL shell
	@docker exec -it driving-school-postgres psql -U admin -d driving_school

shell-redis: ## Open Redis CLI
	@docker exec -it driving-school-redis redis-cli

backup-db: ## Backup database
	@mkdir -p backups
	@docker exec driving-school-postgres pg_dump -U admin driving_school > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backed up to backups/"

restore-db: ## Restore database (use FILE=path/to/backup.sql)
	@docker exec -i driving-school-postgres psql -U admin driving_school < $(FILE)
	@echo "✅ Database restored from $(FILE)"

clear-redis: ## Clear Redis cache
	@docker exec driving-school-redis redis-cli FLUSHALL
	@echo "✅ Redis cache cleared"

clear-analytics-cache: ## Clear only analytics cache in Redis
	@docker exec driving-school-redis redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'analytics:*')))"
	@echo "✅ Analytics cache cleared"

setup: ## First-time setup (install deps, build, migrate)
	@echo "⚙️  Running first-time setup..."
	@make install
	@make build
	@make dev
	@sleep 15
	@make migrate
	@make health
	@echo "✅ Setup complete! All services are running."

update: ## Update all services (pull, install, build, restart)
	@echo "🔄 Updating all services..."
	@git pull
	@make install
	@make build
	@make restart
	@make health
	@echo "✅ Update complete"

quick-start: ## Quick start using the quick-start script
	@./scripts/quick-start.sh

api-test: ## Run API tests
	@./scripts/test-api.sh

coverage: ## Run tests with coverage for all services
	@echo "📊 Running tests with coverage..."
	@cd services/auth && npm test -- --coverage
	@cd services/school && npm test -- --coverage
	@cd services/lesson && npm test -- --coverage
	@cd services/exam && npm test -- --coverage
	@cd services/payment && npm test -- --coverage
	@cd services/notification && npm test -- --coverage
	@cd services/analytics && npm test -- --coverage

watch-logs: ## Watch logs in real-time for all services
	@docker-compose logs -f --tail=100

watch-auth: ## Watch auth service logs
	@docker-compose logs -f --tail=100 auth-service

watch-school: ## Watch school service logs
	@docker-compose logs -f --tail=100 school-service

watch-lesson: ## Watch lesson service logs
	@docker-compose logs -f --tail=100 lesson-service

watch-exam: ## Watch exam service logs
	@docker-compose logs -f --tail=100 exam-service

watch-payment: ## Watch payment service logs
	@docker-compose logs -f --tail=100 payment-service

watch-notification: ## Watch notification service logs
	@docker-compose logs -f --tail=100 notification-service

watch-analytics: ## Watch analytics service logs
	@docker-compose logs -f --tail=100 analytics-service

db-status: ## Show database tables and row counts
	@docker exec driving-school-postgres psql -U admin -d driving_school -c "\dt"
	@echo ""
	@docker exec driving-school-postgres psql -U admin -d driving_school -c "SELECT schemaname, tablename, n_live_tup as rows FROM pg_stat_user_tables ORDER BY tablename;"

redis-status: ## Show Redis info and key count
	@docker exec driving-school-redis redis-cli INFO keyspace
	@echo ""
	@docker exec driving-school-redis redis-cli DBSIZE

redis-keys: ## List all Redis keys
	@docker exec driving-school-redis redis-cli KEYS "*"

redis-analytics-keys: ## List only analytics cache keys
	@docker exec driving-school-redis redis-cli KEYS "analytics:*"

prune: ## Remove unused Docker resources
	@docker system prune -f
	@echo "✅ Docker system pruned"

prune-all: ## Remove ALL Docker resources (images, volumes, etc.)
	@docker system prune -af --volumes
	@echo "✅ All Docker resources removed"

restart-auth: ## Restart auth service
	@docker-compose restart auth-service
	@echo "✅ Auth service restarted"

restart-school: ## Restart school service
	@docker-compose restart school-service
	@echo "✅ School service restarted"

restart-lesson: ## Restart lesson service
	@docker-compose restart lesson-service
	@echo "✅ Lesson service restarted"

restart-exam: ## Restart exam service
	@docker-compose restart exam-service
	@echo "✅ Exam service restarted"

restart-payment: ## Restart payment service
	@docker-compose restart payment-service
	@echo "✅ Payment service restarted"

restart-notification: ## Restart notification service
	@docker-compose restart notification-service
	@echo "✅ Notification service restarted"

restart-analytics: ## Restart analytics service
	@docker-compose restart analytics-service
	@echo "✅ Analytics service restarted"

rebuild-auth: ## Rebuild and restart auth service
	@docker-compose build auth-service
	@docker-compose up -d auth-service
	@echo "✅ Auth service rebuilt and restarted"

rebuild-school: ## Rebuild and restart school service
	@docker-compose build school-service
	@docker-compose up -d school-service
	@echo "✅ School service rebuilt and restarted"

rebuild-lesson: ## Rebuild and restart lesson service
	@docker-compose build lesson-service
	@docker-compose up -d lesson-service
	@echo "✅ Lesson service rebuilt and restarted"

rebuild-exam: ## Rebuild and restart exam service
	@docker-compose build exam-service
	@docker-compose up -d exam-service
	@echo "✅ Exam service rebuilt and restarted"

rebuild-payment: ## Rebuild and restart payment service
	@docker-compose build payment-service
	@docker-compose up -d payment-service
	@echo "✅ Payment service rebuilt and restarted"

rebuild-notification: ## Rebuild and restart notification service
	@docker-compose build notification-service
	@docker-compose up -d notification-service
	@echo "✅ Notification service rebuilt and restarted"

rebuild-analytics: ## Rebuild and restart analytics service
	@docker-compose build analytics-service
	@docker-compose up -d analytics-service
	@echo "✅ Analytics service rebuilt and restarted"