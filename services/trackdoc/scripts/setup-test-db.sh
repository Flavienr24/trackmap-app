#!/bin/bash

# Setup test database with schema
# Usage: ./scripts/setup-test-db.sh

set -e

TEST_DB_PATH="prisma/test.db"

echo "🧪 Setting up test database..."

# Remove existing test database if present
if [ -f "$TEST_DB_PATH" ]; then
    echo "📁 Removing existing test.db"
    rm "$TEST_DB_PATH"
fi

# Create test database with schema using SQL script
echo "📝 Creating schema..."
cat > /tmp/test_schema.sql << 'EOSQL'
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, slug)
);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'TO_IMPLEMENT',
    test_date DATETIME,
    properties TEXT NOT NULL,
    screenshots TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS suggested_values (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    value TEXT NOT NULL,
    is_contextual INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS property_values (
    property_id TEXT NOT NULL,
    suggested_value_id TEXT NOT NULL,
    PRIMARY KEY (property_id, suggested_value_id),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_value_id) REFERENCES suggested_values(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_history (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    author TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pages_product_id ON pages(product_id);
CREATE INDEX IF NOT EXISTS idx_events_page_id ON events(page_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_updated_at ON events(updated_at);
EOSQL

# Execute SQL script
sqlite3 "$TEST_DB_PATH" < /tmp/test_schema.sql

# Verify database was created
if [ -f "$TEST_DB_PATH" ]; then
    SIZE=$(du -h "$TEST_DB_PATH" | cut -f1)
    TABLE_COUNT=$(sqlite3 "$TEST_DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
    echo "✅ Test database created successfully"
    echo "📊 Size: $SIZE"
    echo "📊 Tables: $TABLE_COUNT"
else
    echo "❌ Failed to create test database"
    exit 1
fi

# Clean up temp file
rm -f /tmp/test_schema.sql
