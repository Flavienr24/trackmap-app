#!/bin/bash

# Automatic database backup script with multi-DB support and integrity testing
# Usage: ./scripts/backup-db.sh
#
# Supports: SQLite, PostgreSQL
# Features: Auto-detection, integrity verification, retention management

set -e  # Exit on any error

BACKUP_DIR="prisma/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Detect DATABASE_URL (from env or .env file)
DB_URL="${DATABASE_URL:-$(grep DATABASE_URL .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")}"

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found in environment or .env file"
    exit 1
fi

echo "🗄️  Starting database backup..."
echo "📍 DATABASE_URL: ${DB_URL:0:50}..." # Show first 50 chars only

# Determine database type from URL
if [[ "$DB_URL" == *"sqlite"* || "$DB_URL" == file:* ]]; then
    DB_TYPE="sqlite"
    DB_PATH=$(echo "$DB_URL" | sed 's/file://g' | sed 's/^"\(.*\)"$/\1/')
elif [[ "$DB_URL" == *"postgres"* ]]; then
    DB_TYPE="postgres"
else
    echo "❌ Unsupported database type in DATABASE_URL"
    echo "   Supported: sqlite (file:*), postgresql (postgres:*)"
    exit 1
fi

echo "📊 Detected database type: $DB_TYPE"

# Perform backup based on database type
if [ "$DB_TYPE" = "sqlite" ]; then
    # ===== SQLite Backup =====
    if [ ! -f "$DB_PATH" ]; then
        echo "❌ SQLite database not found at: $DB_PATH"
        exit 1
    fi

    BACKUP_FILE="$BACKUP_DIR/$(basename "$DB_PATH").backup.$TIMESTAMP"

    # Use sqlite3 .backup command if available (more reliable than cp)
    if command -v sqlite3 &> /dev/null; then
        echo "🔧 Using sqlite3 .backup command..."
        sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
    else
        echo "⚠️  sqlite3 not found, using cp fallback..."
        cp "$DB_PATH" "$BACKUP_FILE"
    fi

    # Verify backup was created and is not empty
    if [ ! -s "$BACKUP_FILE" ]; then
        echo "❌ Backup file empty or missing!"
        exit 1
    fi

    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

    # ===== Integrity Check for SQLite =====
    if command -v sqlite3 &> /dev/null; then
        echo "🧪 Testing backup integrity..."

        # Create temporary restore to verify backup
        TEST_DB="/tmp/test_backup_restore_$TIMESTAMP.db"

        # Restore backup to temp file
        if sqlite3 "$TEST_DB" ".restore '$BACKUP_FILE'" 2>/dev/null || cp "$BACKUP_FILE" "$TEST_DB"; then
            # Run SQLite integrity check
            INTEGRITY=$(sqlite3 "$TEST_DB" "PRAGMA integrity_check;" 2>/dev/null || echo "FAILED")

            if [ "$INTEGRITY" = "ok" ]; then
                echo "✅ Backup integrity verified (PRAGMA integrity_check: ok)"

                # Additional check: count tables
                TABLE_COUNT=$(sqlite3 "$TEST_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
                echo "📊 Tables in backup: $TABLE_COUNT"

                if [ "$TABLE_COUNT" -eq "0" ]; then
                    echo "⚠️  WARNING: Backup contains no tables!"
                fi
            else
                echo "❌ Backup integrity check failed!"
                echo "   PRAGMA integrity_check returned: $INTEGRITY"
                rm -f "$TEST_DB"
                exit 1
            fi

            # Cleanup test database
            rm -f "$TEST_DB"
        else
            echo "⚠️  Could not test backup integrity (restore failed)"
        fi
    else
        echo "⚠️  sqlite3 not available - skipping integrity verification"
    fi

elif [ "$DB_TYPE" = "postgres" ]; then
    # ===== PostgreSQL Backup =====
    BACKUP_FILE="$BACKUP_DIR/postgres.backup.$TIMESTAMP.sql.gz"

    if ! command -v pg_dump &> /dev/null; then
        echo "❌ pg_dump not found! Install PostgreSQL client tools."
        exit 1
    fi

    echo "🔧 Using pg_dump..."

    # Create compressed SQL dump
    if pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"; then
        # Verify backup was created and is not empty
        if [ ! -s "$BACKUP_FILE" ]; then
            echo "❌ Backup file empty or missing!"
            exit 1
        fi

        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "✅ Backup created: $BACKUP_FILE ($SIZE)"

        # ===== Integrity Check for PostgreSQL =====
        echo "🧪 Testing backup integrity..."

        # Verify gzip file is valid
        if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
            echo "✅ Backup file is valid gzip archive"

            # Check SQL content (basic validation)
            SQL_LINES=$(gunzip -c "$BACKUP_FILE" | head -100 | wc -l)
            if [ "$SQL_LINES" -gt "0" ]; then
                echo "✅ Backup contains SQL data ($SQL_LINES+ lines)"
            else
                echo "❌ Backup appears empty!"
                exit 1
            fi
        else
            echo "❌ Backup file is corrupted (invalid gzip)!"
            exit 1
        fi
    else
        echo "❌ pg_dump failed!"
        exit 1
    fi
fi

# ===== Cleanup Old Backups (keep last 10) =====
echo "🧹 Cleaning old backups (keeping last 10)..."
cd "$BACKUP_DIR"
ls -1t *.backup.* 2>/dev/null | tail -n +11 | xargs -r rm
REMAINING=$(ls -1 *.backup.* 2>/dev/null | wc -l)
echo "📦 Total backups retained: $REMAINING"

echo "✅ Backup process completed successfully!"
exit 0
