#!/bin/bash
set -e

# ============================================================================
# backup-upload.sh - Upload encrypted database backups to S3
# ============================================================================
#
# This script uploads the most recent local backup to AWS S3 with AES-256
# encryption. It is designed to be optional in dev, required in production.
#
# USAGE:
#   ./scripts/backup-upload.sh
#   npm run db:backup:upload
#
# ENVIRONMENT VARIABLES:
#   BACKUP_S3_BUCKET         - S3 bucket name (default: trackmap-db-backups)
#   BACKUP_ENCRYPTION_KEY    - Encryption key for AES-256 (REQUIRED)
#   NODE_ENV                 - Environment (dev/staging/production)
#   SKIP_UPLOAD              - Set to "true" to skip upload (dev only)
#
# REQUIRES:
#   - openssl (encryption)
#   - aws cli (S3 upload)
#
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Configuration
S3_BUCKET="${BACKUP_S3_BUCKET:-trackmap-db-backups}"
BACKUP_DIR="prisma/backups"
NODE_ENV="${NODE_ENV:-development}"
SKIP_UPLOAD="${SKIP_UPLOAD:-false}"

# Validate encryption key
if [ -z "$BACKUP_ENCRYPTION_KEY" ]; then
    echo "❌ ERROR: BACKUP_ENCRYPTION_KEY not set"
    echo ""
    echo "Generate one with:"
    echo "  openssl rand -base64 32"
    echo ""
    echo "Then add to .env:"
    echo "  BACKUP_ENCRYPTION_KEY=<generated-key>"
    exit 1
fi

# Check if upload should be skipped (dev only)
if [ "$NODE_ENV" = "development" ] && [ "$SKIP_UPLOAD" = "true" ]; then
    echo "ℹ️  Development mode: Skipping S3 upload (SKIP_UPLOAD=true)"
    exit 0
fi

# Find latest backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.backup.* 2>/dev/null | head -1)

if [ ! -f "$LATEST_BACKUP" ]; then
    echo "❌ ERROR: No backup found in $BACKUP_DIR/"
    echo "Run 'npm run db:backup' first"
    exit 1
fi

BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
ENCRYPTED_FILE="${LATEST_BACKUP}.enc"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "========================================"
echo "🔐 Backup Cloud Upload"
echo "========================================"
echo "Environment: $NODE_ENV"
echo "Backup file: $BACKUP_FILENAME"
echo "S3 Bucket: s3://$S3_BUCKET"
echo ""

# Encryption
echo "🔐 Encrypting backup..."
if ! openssl enc -aes-256-cbc -salt -pbkdf2 -in "$LATEST_BACKUP" -out "$ENCRYPTED_FILE" -k "$BACKUP_ENCRYPTION_KEY"; then
    echo "❌ Encryption failed!"
    exit 1
fi

ENCRYPTED_SIZE=$(du -h "$ENCRYPTED_FILE" | cut -f1)
echo "✅ Encrypted: $ENCRYPTED_SIZE"

# Upload to S3
echo ""
echo "☁️  Uploading to S3..."

if ! command -v aws &> /dev/null; then
    echo "❌ ERROR: AWS CLI not installed"
    echo ""
    echo "Install with:"
    echo "  brew install awscli"
    echo "  aws configure"
    rm -f "$ENCRYPTED_FILE"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ ERROR: AWS credentials not configured"
    echo ""
    echo "Run: aws configure"
    rm -f "$ENCRYPTED_FILE"
    exit 1
fi

# Upload with metadata
S3_KEY="backups/${NODE_ENV}/${BACKUP_FILENAME}.enc"

if aws s3 cp "$ENCRYPTED_FILE" "s3://$S3_BUCKET/$S3_KEY" \
    --metadata "environment=$NODE_ENV,timestamp=$TIMESTAMP,encrypted=true"; then
    echo "✅ Uploaded: s3://$S3_BUCKET/$S3_KEY"
else
    echo "❌ Upload failed!"
    rm -f "$ENCRYPTED_FILE"
    exit 1
fi

# Cleanup local encrypted file
rm -f "$ENCRYPTED_FILE"
echo "🗑️  Local encrypted file removed"

echo ""
echo "========================================"
echo "✅ Backup uploaded successfully"
echo "========================================"
echo ""
echo "To restore:"
echo "  aws s3 cp s3://$S3_BUCKET/$S3_KEY /tmp/backup.enc"
echo "  npm run db:restore /tmp/backup.enc"
echo ""

# Production warning
if [ "$NODE_ENV" = "production" ]; then
    echo "🔔 PRODUCTION BACKUP UPLOADED"
    echo "   Verify backup integrity ASAP"
fi
