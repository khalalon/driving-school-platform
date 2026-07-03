#!/bin/bash

# ============================================
# Database Migration Script
# Driving School Management Platform
# ============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_CONTAINER="driving-school-postgres"
DB_USER="admin"
DB_NAME="driving_school"
MIGRATIONS_DIR="../migrations"

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Database Migration Script               ║${NC}"
echo -e "${BLUE}║   Driving School Platform                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if PostgreSQL container exists
if ! docker ps -a | grep -q $DB_CONTAINER; then
    echo -e "${YELLOW}⚠️  PostgreSQL container not found. Starting it now...${NC}"
    docker compose up -d postgres
    echo -e "${YELLOW}⏳ Waiting 10 seconds for PostgreSQL to be ready...${NC}"
    sleep 10
fi

# Check if PostgreSQL container is running
if ! docker ps | grep -q $DB_CONTAINER; then
    echo -e "${YELLOW}⚠️  PostgreSQL container is not running. Starting it...${NC}"
    docker start $DB_CONTAINER
    echo -e "${YELLOW}⏳ Waiting 5 seconds for PostgreSQL to be ready...${NC}"
    sleep 5
fi

# Wait for PostgreSQL to be ready
echo -e "${BLUE}🔍 Checking PostgreSQL connection...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec $DB_CONTAINER pg_isready -U $DB_USER > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${YELLOW}⏳ Waiting for PostgreSQL... (${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ PostgreSQL failed to start after ${MAX_RETRIES} seconds${NC}"
    exit 1
fi

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Count migration files
MIGRATION_COUNT=$(ls -1 $MIGRATIONS_DIR/*.sql 2>/dev/null | wc -l)

if [ $MIGRATION_COUNT -eq 0 ]; then
    echo -e "${RED}❌ No migration files found in $MIGRATIONS_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Found $MIGRATION_COUNT migration file(s)${NC}"
echo ""

# Run each migration file in order
for migration_file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
    filename=$(basename "$migration_file")
    echo -e "${BLUE}🔄 Running migration: ${filename}${NC}"
    
    if docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$migration_file" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Successfully applied: ${filename}${NC}"
    else
        echo -e "${RED}❌ Failed to apply: ${filename}${NC}"
        echo -e "${YELLOW}💡 Tip: Check if migration was already applied or if there's a syntax error${NC}"
        
        # Show error details
        echo -e "${YELLOW}Running migration again to see error details...${NC}"
        docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME < "$migration_file"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All Migrations Completed!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Show created tables
echo -e "${BLUE}📊 Database Tables:${NC}"
docker exec -it $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "\dt"

echo ""
echo -e "${BLUE}📈 Table Row Counts:${NC}"
docker exec -it $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
SELECT 
    schemaname,
    tablename,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
FROM (
    SELECT 
        table_schema AS schemaname,
        table_name AS tablename,
        table_name,
        query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') AS xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
) t
ORDER BY tablename;
"

echo ""
echo -e "${GREEN}🎉 Migration process completed successfully!${NC}"
echo -e "${BLUE}💡 You can now start your services with: docker compose up -d${NC}"
