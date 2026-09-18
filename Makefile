.PHONY: help dev prod stop clean logs restart build ps stats health install typecheck lint test format migrate shell-postgres shell-redis backup-db restore-db db-status redis-status redis-keys clear-redis prune prune-all test-e2e

API_DIR := services/api

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---------- Stack Docker (postgres, redis, api, nginx) ----------

dev: ## Rebuild and start the stack (docker-compose.yml)
	docker compose down
	docker compose build
	docker compose up -d
	@docker compose ps

dev-watch: ## Start the stack with the API in ts-node-dev (docker-compose.dev.yml)
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
	@docker compose ps

prod: ## Start the stack with the production overrides (docker-compose.prod.yml)
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
	@docker compose ps

stop: ## Stop all containers
	docker compose down

clean: ## Stop everything and delete volumes (database included)
	docker compose down -v

logs: ## Follow logs (SERVICE=api|nginx|postgres|redis, all by default)
	docker compose logs -f --tail=100 $(SERVICE)

restart: ## Restart a container (SERVICE=api|nginx|postgres|redis)
	docker compose restart $(SERVICE)

build: ## Build the Docker images
	@docker compose build

ps: ## Show running containers
	@docker compose ps

stats: ## Show container stats
	@docker stats --no-stream

health: ## Check the gateway and the API
	@curl -sf http://localhost/health > /dev/null && echo "✅ Nginx (80) is healthy" || echo "❌ Nginx (80) is down"
	@curl -sf http://localhost:3000/health > /dev/null && echo "✅ API (3000) is healthy" || echo "❌ API (3000) is down"

# ---------- Application (services/api) ----------

install: ## Install API dependencies (npm ci)
	@cd $(API_DIR) && npm ci

typecheck: ## Typecheck the API (tsc --noEmit)
	@cd $(API_DIR) && npx tsc --noEmit

lint: ## Lint the API
	@cd $(API_DIR) && npm run lint

test: ## Run the API unit tests with coverage
	@cd $(API_DIR) && npm test

format: ## Format the API sources
	@cd $(API_DIR) && npm run format

test-e2e: ## Run the end-to-end tests against the running stack (tests/)
	@npm run test:e2e

# ---------- Base de données ----------

migrate: ## Apply pending database migrations (idempotent, see scripts/migrate.sh)
	@bash scripts/migrate.sh

shell-postgres: ## Open a PostgreSQL shell
	@docker exec -it driving-school-postgres psql -U admin -d driving_school

shell-redis: ## Open a Redis CLI
	@docker exec -it driving-school-redis redis-cli

backup-db: ## Backup the database into backups/
	@mkdir -p backups
	@docker exec driving-school-postgres pg_dump -U admin driving_school > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Database backed up to backups/"

restore-db: ## Restore the database (FILE=path/to/backup.sql)
	@docker exec -i driving-school-postgres psql -U admin driving_school < $(FILE)
	@echo "✅ Database restored from $(FILE)"

db-status: ## Show tables and row counts
	@docker exec driving-school-postgres psql -U admin -d driving_school -c "\dt"
	@echo ""
	@docker exec driving-school-postgres psql -U admin -d driving_school -c "SELECT schemaname, tablename, n_live_tup as rows FROM pg_stat_user_tables ORDER BY tablename;"

redis-status: ## Show Redis keyspace info
	@docker exec driving-school-redis redis-cli INFO keyspace
	@echo ""
	@docker exec driving-school-redis redis-cli DBSIZE

redis-keys: ## List all Redis keys
	@docker exec driving-school-redis redis-cli KEYS "*"

clear-redis: ## Flush Redis
	@docker exec driving-school-redis redis-cli FLUSHALL
	@echo "✅ Redis cache cleared"

# ---------- Docker housekeeping ----------

prune: ## Remove unused Docker resources
	@docker system prune -f

prune-all: ## Remove ALL unused Docker resources, volumes included
	@docker system prune -af --volumes
