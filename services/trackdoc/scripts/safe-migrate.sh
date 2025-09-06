#!/bin/bash

# Safe migration script with automatic backup
# Usage: ./scripts/safe-migrate.sh "description-of-migration"

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: $0 'migration-description'"
    echo "   Example: $0 'add-url-field-to-products'"
    exit 1
fi

MIGRATION_NAME="$1"

echo "🚀 Starting safe migration: $MIGRATION_NAME"

# Step 1: Create backup
echo "1️⃣ Creating database backup..."
./scripts/backup-db.sh

# Step 2: Run migration
echo "2️⃣ Running Prisma migration..."
npx prisma migrate dev --name "$MIGRATION_NAME"

# Step 3: Generate client
echo "3️⃣ Generating Prisma client..."
npx prisma generate

# Step 4: Verify data integrity
echo "4️⃣ Verifying data integrity..."
DATA_COUNT=$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM products;" 2>/dev/null || echo "0")
echo "📊 Products in database: $DATA_COUNT"

if [ "$DATA_COUNT" = "0" ]; then
    echo "⚠️  WARNING: No products found in database after migration!"
    echo "   Consider restoring from backup if data was expected."
fi

# Step 5: Run tests
echo "5️⃣ Running tests..."
if npm test; then
    echo "✅ Migration completed successfully!"
    echo "🎯 Migration: $MIGRATION_NAME"
    echo "📊 Products: $DATA_COUNT"
else
    echo "❌ Tests failed after migration!"
    echo "   Consider rolling back using the backup."
    exit 1
fi