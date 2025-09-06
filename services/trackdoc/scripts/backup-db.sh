#!/bin/bash

# Automatic database backup script
# Usage: ./scripts/backup-db.sh

set -e

DB_PATH="prisma/dev.db"
BACKUP_DIR="prisma/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dev.db.backup.$TIMESTAMP"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at $DB_PATH"
    exit 1
fi

# Create backup
cp "$DB_PATH" "$BACKUP_FILE"

# Verify backup was created successfully
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Database backed up successfully to $BACKUP_FILE"
    
    # Show backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Backup size: $SIZE"
    
    # Keep only last 10 backups
    cd "$BACKUP_DIR"
    ls -1t dev.db.backup.* | tail -n +11 | xargs -r rm
    echo "🧹 Cleaned old backups (keeping last 10)"
else
    echo "❌ Backup failed!"
    exit 1
fi