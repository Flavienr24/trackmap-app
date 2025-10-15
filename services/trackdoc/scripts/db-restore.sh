#!/bin/bash
set -e

# ============================================================================
# db-restore.sh - Restore database from backup
# ============================================================================
#
# This script restores a database from a local or S3 backup file.
# Supports both encrypted and unencrypted backups.
# Works with SQLite and PostgreSQL.
#
# USAGE:
#   ./scripts/db-restore.sh <backup-file-path>
#   npm run db:restore <backup-file-path>
#
# EXAMPLES:
#   # Restore from local backup
#   npm run db:restore prisma/backups/dev.db.backup.20251015_143022.db
#
#   # Restore from S3 encrypted backup
#   aws s3 cp s3://trackmap-db-backups/backups/production/backup.enc /tmp/
#   npm run db:restore /tmp/backup.enc
#
# ENVIRONMENT VARIABLES:
#   DATABASE_URL              - Database connection string
#   BACKUP_ENCRYPTION_KEY     - Required for encrypted (.enc) files
#
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Parse DATABASE_URL from environment or .env
DB_URL="${DATABASE_URL:-$(grep '^DATABASE_URL' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo '')}"

if [ -z "$DB_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found"
    echo "Set it in .env or environment"
    exit 1
fi

# Usage help
if [ -z "$1" ]; then
    echo "========================================"
    echo "📦 Database Restore Tool"
    echo "========================================"
    echo ""
    echo "USAGE: $0 <backup-file-path>"
    echo ""
    echo "Available local backups:"
    if ls prisma/backups/*.backup.* 2>/dev/null | head -10; then
        echo ""
    else
        echo "  (none found)"
        echo ""
    fi
    echo "To restore from S3:"
    echo "  1. List available backups:"
    echo "     aws s3 ls s3://trackmap-db-backups/backups/"
    echo ""
    echo "  2. Download backup:"
    echo "     aws s3 cp s3://trackmap-db-backups/backups/<env>/<file> /tmp/"
    echo ""
    echo "  3. Restore:"
    echo "     $0 /tmp/<file>"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "========================================"
echo "📦 Database Restore"
echo "========================================"
echo "Backup file: $BACKUP_FILE"
echo "Target DB: $DB_URL"
echo ""

# Check if backup is encrypted
DECRYPTED=""
if [[ "$BACKUP_FILE" == *.enc ]]; then
    echo "🔐 Encrypted backup detected"

    if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
        echo "❌ ERROR: BACKUP_ENCRYPTION_KEY not set"
        echo "Required to decrypt .enc files"
        exit 1
    fi

    echo "🔓 Decrypting..."
    DECRYPTED="/tmp/decrypted_$(date +%s).db"

    if ! openssl enc -aes-256-cbc -d -pbkdf2 -in "$BACKUP_FILE" -out "$DECRYPTED" -k "$BACKUP_ENCRYPTION_KEY"; then
        echo "❌ Decryption failed!"
        echo "Check BACKUP_ENCRYPTION_KEY is correct"
        rm -f "$DECRYPTED"
        exit 1
    fi

    BACKUP_FILE="$DECRYPTED"
    echo "✅ Decrypted to temporary file"
fi

# Detect database type
if [[ "$DB_URL" == *"sqlite"* ]] || [[ "$DB_URL" == file:* ]]; then
    DB_TYPE="sqlite"
    DB_PATH=$(echo "$DB_URL" | sed 's|^file:||g')
elif [[ "$DB_URL" == *"postgres"* ]]; then
    DB_TYPE="postgres"
else
    echo "❌ ERROR: Unsupported database type in DATABASE_URL"
    [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
    exit 1
fi

echo ""
echo "Database type: $DB_TYPE"
echo ""

# Restore based on database type
if [ "$DB_TYPE" = "sqlite" ]; then
    echo "⚠️  WARNING: This will OVERWRITE the current database:"
    echo "   $DB_PATH"
    echo ""
    read -p "Continue? Type 'yes' to confirm: " CONFIRM
    echo ""

    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Restore cancelled"
        [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
        exit 0
    fi

    # Create backup of current DB before overwriting
    if [ -f "$DB_PATH" ]; then
        SAFETY_BACKUP="${DB_PATH}.pre-restore.$(date +%Y%m%d_%H%M%S).backup"
        echo "💾 Creating safety backup of current DB..."
        cp "$DB_PATH" "$SAFETY_BACKUP"
        echo "✅ Safety backup: $SAFETY_BACKUP"
        echo ""
    fi

    # Restore using sqlite3 if available, otherwise cp
    if command -v sqlite3 &> /dev/null; then
        echo "🔄 Restoring with sqlite3..."

        # For SQLite backups created with .backup command
        if sqlite3 "$DB_PATH" ".restore '$BACKUP_FILE'" 2>/dev/null; then
            echo "✅ Restored with sqlite3 .restore"
        else
            # Fallback to file copy
            echo "ℹ️  Using file copy method..."
            cp "$BACKUP_FILE" "$DB_PATH"
            echo "✅ Restored with file copy"
        fi
    else
        echo "ℹ️  sqlite3 not found, using file copy..."
        cp "$BACKUP_FILE" "$DB_PATH"
        echo "✅ Restored with file copy"
    fi

    # Verify restored database
    if command -v sqlite3 &> /dev/null; then
        echo ""
        echo "🔍 Verifying restored database..."

        INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "failed")
        if [ "$INTEGRITY" = "ok" ]; then
            echo "✅ Integrity check: OK"
        else
            echo "⚠️  WARNING: Integrity check returned: $INTEGRITY"
        fi

        TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "✅ Tables found: $TABLE_COUNT"
    fi

    echo ""
    echo "✅ SQLite database restored successfully"

elif [ "$DB_TYPE" = "postgres" ]; then
    echo "⚠️  WARNING: This will restore data to the PostgreSQL database"
    echo "   Connection: $DB_URL"
    echo ""
    echo "IMPORTANT: This does NOT drop existing tables."
    echo "If you need a clean restore, drop the database first:"
    echo "   DROP DATABASE <dbname>; CREATE DATABASE <dbname>;"
    echo ""
    read -p "Continue? Type 'yes' to confirm: " CONFIRM
    echo ""

    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Restore cancelled"
        [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
        exit 0
    fi

    if ! command -v psql &> /dev/null; then
        echo "❌ ERROR: psql not installed"
        echo "Install with: brew install postgresql"
        [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
        exit 1
    fi

    echo "🔄 Restoring PostgreSQL database..."

    # Check if backup is gzipped
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo "📦 Decompressing gzip archive..."
        if gunzip -c "$BACKUP_FILE" | psql "$DB_URL"; then
            echo "✅ PostgreSQL restored from gzip"
        else
            echo "❌ Restore failed!"
            [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
            exit 1
        fi
    else
        # Plain SQL file
        if psql "$DB_URL" < "$BACKUP_FILE"; then
            echo "✅ PostgreSQL restored from SQL"
        else
            echo "❌ Restore failed!"
            [ -n "$DECRYPTED" ] && rm -f "$DECRYPTED"
            exit 1
        fi
    fi

    echo ""
    echo "✅ PostgreSQL database restored successfully"
fi

# Cleanup decrypted temporary file
if [ -n "$DECRYPTED" ]; then
    rm -f "$DECRYPTED"
    echo "🗑️  Temporary decrypted file removed"
fi

echo ""
echo "========================================"
echo "✅ Restore Complete"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm test"
echo "  2. Verify data integrity"
echo "  3. Check application functionality"
echo ""

if [ "$DB_TYPE" = "sqlite" ] && [ -n "$SAFETY_BACKUP" ]; then
    echo "Safety backup available at:"
    echo "  $SAFETY_BACKUP"
    echo ""
fi
