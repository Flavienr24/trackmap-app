#!/bin/bash

# Safe migration script with automatic backup and environment detection
# Usage: ./scripts/safe-migrate.sh "description-of-migration"
#
# 🚨 CRITICAL: Uses 'migrate dev' in dev, 'migrate deploy' in staging/prod

set -e  # Exit immediately if any command fails

if [ -z "$1" ]; then
    echo "❌ Usage: $0 'migration-description'"
    echo "   Example: $0 'add-url-field-to-products'"
    exit 1
fi

MIGRATION_NAME="$1"
ENVIRONMENT="${NODE_ENV:-development}"

echo "🚀 Starting safe migration: $MIGRATION_NAME"
echo "📍 Environment: $ENVIRONMENT"

# Step 0: Determine migration command based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🔒 PRODUCTION DETECTED - Using 'migrate deploy' (safe, idempotent)"
    MIGRATE_CMD="npx prisma migrate deploy"
    SKIP_TESTS=true
elif [ "$ENVIRONMENT" = "staging" ]; then
    echo "⚠️  STAGING DETECTED - Using 'migrate deploy'"
    MIGRATE_CMD="npx prisma migrate deploy"
    SKIP_TESTS=false
else
    echo "🔧 DEVELOPMENT DETECTED - Using 'migrate dev'"
    MIGRATE_CMD="npx prisma migrate dev --name \"$MIGRATION_NAME\""
    SKIP_TESTS=false
fi

# Step 1: Create backup with VERIFICATION
echo "1️⃣ Creating database backup..."
if ! ./scripts/backup-db.sh; then
    echo "❌ CRITICAL: Backup failed! Migration aborted."
    echo "   Fix backup script before proceeding."
    exit 1
fi

# Verify backup file exists and is not empty
LATEST_BACKUP=$(ls -t prisma/backups/*.backup.* 2>/dev/null | head -1)
if [ ! -s "$LATEST_BACKUP" ]; then
    echo "❌ CRITICAL: Backup file missing or empty! Migration aborted."
    echo "   Expected: prisma/backups/*.backup.*"
    exit 1
fi

BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
echo "✅ Backup verified: $LATEST_BACKUP ($BACKUP_SIZE)"

# Step 2: Run migration with environment-specific command
echo "2️⃣ Running Prisma migration ($ENVIRONMENT)..."
eval "$MIGRATE_CMD"

# Step 3: Generate client
echo "3️⃣ Generating Prisma client..."
npx prisma generate

# Step 4: Verify data integrity (multi-table validation)
echo "4️⃣ Verifying data integrity..."

# Detect database type from DATABASE_URL (handle missing .env file)
DB_URL="${DATABASE_URL:-$(grep DATABASE_URL .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' || echo '')}"

if [ -z "$DB_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL not found in environment or .env file"
    echo "   Skipping integrity check"
else

if [[ "$DB_URL" == *"sqlite"* || "$DB_URL" == file:* ]]; then
    # SQLite integrity check
    DB_PATH=$(echo "$DB_URL" | sed 's/file://g' | sed 's/^"\(.*\)"$/\1/')

    if command -v sqlite3 &> /dev/null && [ -f "$DB_PATH" ]; then
        PRODUCTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM products;" 2>/dev/null || echo "0")
        PAGES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM pages;" 2>/dev/null || echo "0")
        EVENTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM events;" 2>/dev/null || echo "0")

        echo "📊 Database integrity (SQLite):"
        echo "   - Products: $PRODUCTS"
        echo "   - Pages: $PAGES"
        echo "   - Events: $EVENTS"

        if [ "$PRODUCTS" = "0" ] && [ "$PAGES" = "0" ] && [ "$EVENTS" = "0" ]; then
            echo "⚠️  WARNING: Database appears empty after migration!"
            echo "   This may be expected for new migrations."
            echo "   To restore: cp $LATEST_BACKUP $DB_PATH"
        fi
    else
        echo "⚠️  SQLite3 not found or DB not accessible - skipping integrity check"
    fi

elif [[ "$DB_URL" == *"postgres"* ]]; then
    # PostgreSQL integrity check
    echo "📊 PostgreSQL database detected"

    if command -v psql &> /dev/null; then
        PRODUCTS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | xargs || echo "0")
        PAGES=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pages;" 2>/dev/null | xargs || echo "0")
        EVENTS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM events;" 2>/dev/null | xargs || echo "0")

        echo "📊 Database integrity (PostgreSQL):"
        echo "   - Products: $PRODUCTS"
        echo "   - Pages: $PAGES"
        echo "   - Events: $EVENTS"
    else
        echo "⚠️  psql not found - skipping integrity check"
    fi
else
    echo "⚠️  Unknown database type - skipping integrity check"
    echo "   DATABASE_URL: $DB_URL"
fi
fi  # Close the if [ -z "$DB_URL" ] check

# Step 5: Run tests (skip in production)
if [ "$SKIP_TESTS" = "true" ]; then
    echo "5️⃣ Skipping tests in production (run separately in CI/CD)"
    echo "✅ Migration deployed successfully!"
    echo "🎯 Migration: $MIGRATION_NAME"
    echo "⚠️  REMINDER: Run smoke tests manually to verify migration"
else
    echo "5️⃣ Running tests..."
    if npm test; then
        echo "✅ Migration completed successfully!"
        echo "🎯 Migration: $MIGRATION_NAME"
    else
        echo "❌ Tests failed after migration!"
        echo "🔄 Rollback procedure:"

        # Provide DB-specific rollback instructions
        if [[ "$DB_URL" == *"sqlite"* || "$DB_URL" == file:* ]]; then
            echo "   1. Restore SQLite DB: cp $LATEST_BACKUP $DB_PATH"
        elif [[ "$DB_URL" == *"postgres"* ]]; then
            echo "   1. Restore PostgreSQL DB:"
            echo "      gunzip -c $LATEST_BACKUP | psql \$DATABASE_URL"
        else
            echo "   1. Restore DB from: $LATEST_BACKUP"
        fi

        echo "   2. Mark migration as rolled back:"
        echo "      npx prisma migrate resolve --rolled-back \"$MIGRATION_NAME\""
        exit 1
    fi
fi
